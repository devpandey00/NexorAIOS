import { getDatabaseClients, JobStatus, CampaignStatus, LeadStatus, OutreachChannel, OutreachStatus, type Prisma } from '@nexor/database';
import { leadSearchService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { assessLead, buildPersonalizedPitch } from '@nexor/core';

const prisma = getDatabaseClients().write;
function normalizeWebsite(url: string): string { try { const parsed = new URL(url); return `${parsed.protocol}//${parsed.hostname.replace(/^www\./,'').toLowerCase()}${parsed.pathname.replace(/\/$/,'')}`; } catch { return url.trim().toLowerCase().replace(/\/$/,''); } }
function normalizePhone(phone: string): string { return phone.replace(/\D/g,''); }
function cleanLeadName(name: string): string { return name.replace(/\s+/g,' ').replace(/\s*[|·–—-]\s*$/g,'').trim(); }
function looksLikeNonBusinessName(name: string): boolean { return [/\bbest\b/i,/\btop\b/i,/\blist\b/i,/\bdirectory\b/i,/\bguide\b/i,/\broundup\b/i,/\barticles?\b/i,/\bhow to\b/i,/\bstrategy\b/i,/\bpatients?\b/i,/\bget \d+x\b/i,/\bcompanies\b/i].some((pattern) => pattern.test(name)); }
function inferNiche(query: string): string { return query.split(/\s+(?:in|at|for|with|needs|looking|seeking|want|requires)\s+/i)[0]?.trim() || query.trim(); }
function inferCountry(query: string): string { const match = query.match(/\bin\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)?)(?=\s+(?:Google|Meta|Facebook|Instagram|TikTok|LinkedIn|needs|looking|seeking|want|requires|for)\b|$)/i); return match?.[1]?.trim() || 'Unknown'; }
async function findDuplicateLead(input: { website?: string; email?: string; whatsapp?: string; socialUrls?: string[]; businessName: string }) {
  const or: Prisma.LeadWhereInput[] = [];
  if (input.website) or.push({ website: input.website }); if (input.email) or.push({ email: input.email }); if (input.whatsapp) or.push({ whatsapp: input.whatsapp }); if (input.businessName) or.push({ businessName: { equals: input.businessName, mode: 'insensitive' } });
  if (input.socialUrls?.length) { const social = await prisma.socialProfile.findFirst({ where: { url: { in: input.socialUrls } }, select: { leadId: true } }); if (social) return prisma.lead.findUnique({ where: { id: social.leadId } }); }
  return or.length ? prisma.lead.findFirst({ where: { OR: or }, orderBy: { createdAt: 'desc' } }) : null;
}

export async function runCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } }); if (!campaign) throw new Error('Campaign not found');
  const job = await prisma.job.findFirst({ where: { campaignId, status: JobStatus.QUEUED }, orderBy: { createdAt: 'asc' } }); if (!job) throw new Error('No queued discovery job found');
  await prisma.$transaction([prisma.campaign.update({ where: { id: campaignId }, data: { status: CampaignStatus.RUNNING, startedAt: new Date() } }),prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } } })]);
  try {
    const searchResult = await leadSearchService.search(campaign.query); let processed = 0, successful = 0, failed = 0, qualified = 0; const niche = inferNiche(campaign.query); const country = inferCountry(campaign.query);
    for (const result of searchResult.leads) {
      try {
        const businessName = cleanLeadName(result.name); if (!businessName || looksLikeNonBusinessName(businessName)) { processed++; continue; }
        const normalizedWebsite = result.website ? normalizeWebsite(result.website) : ''; const normalizedPhone = result.phone ? normalizePhone(result.phone) : '';
        let lead = await findDuplicateLead({ businessName, website: normalizedWebsite, whatsapp: normalizedPhone }); let createdThisRun = false;
        if (!lead) { lead = await prisma.lead.create({ data: { businessName, niche, country, website: normalizedWebsite || undefined, whatsapp: normalizedPhone || undefined, status: LeadStatus.NEW } }); createdThisRun = true; }
        await prisma.campaignLead.upsert({ where: { campaignId_leadId: { campaignId, leadId: lead.id } }, create: { campaignId, leadId: lead.id }, update: {} });
        if (!result.website) { if (normalizedPhone && !lead.whatsapp) await prisma.lead.update({ where: { id: lead.id }, data: { whatsapp: normalizedPhone } }); processed++; successful++; continue; }
        const research = await researchService.analyze(result.website); if (!research.success) { processed++; failed++; continue; }
        const intelligence = assessLead({ website: research.website, technology: research.technology, social: Object.fromEntries(Object.entries(research.social ?? {})), seo: Object.fromEntries(Object.entries(research.seo ?? {})) });
        const email = research.contacts?.emails?.[0]; const phone = research.contacts?.phones?.[0]; const normalizedResearchPhone = phone ? normalizePhone(phone) : normalizedPhone; const social = Object.fromEntries(Object.entries(research.social ?? {})) as Record<string, unknown>; const socialUrls = Object.values(social).filter((value): value is string => typeof value === 'string' && value.startsWith('http'));
        if (createdThisRun) { const duplicateAfterResearch = await findDuplicateLead({ website: normalizedWebsite, email, whatsapp: normalizedResearchPhone, socialUrls, businessName }); if (duplicateAfterResearch && duplicateAfterResearch.id !== lead.id) { await prisma.lead.delete({ where: { id: lead.id } }); lead = duplicateAfterResearch; await prisma.campaignLead.upsert({ where: { campaignId_leadId: { campaignId, leadId: lead.id } }, create: { campaignId, leadId: lead.id }, update: {} }); } }
        await prisma.lead.update({ where: { id: lead.id }, data: { businessName, niche, country: lead.country === 'Unknown' ? country : lead.country, email: email ?? lead.email, whatsapp: normalizedResearchPhone || lead.whatsapp, auditScore: intelligence.score, status: intelligence.score >= 60 ? LeadStatus.QUALIFIED : LeadStatus.RESEARCHED, notes: JSON.stringify({ research, intelligence, source: 'campaign-discovery' }) } });
        const socialEntries = [['INSTAGRAM', social.instagram],['FACEBOOK', social.facebook],['LINKEDIN', social.linkedin],['YOUTUBE', social.youtube],['X', social.x ?? social.twitter],['TIKTOK', social.tiktok]] as const;
        for (const [platform, url] of socialEntries) { if (typeof url !== 'string' || !url) continue; await prisma.socialProfile.upsert({ where: { leadId_platform: { leadId: lead.id, platform } }, create: { leadId: lead.id, platform, url, confidence: 100, source: 'website-research' }, update: { url, confidence: 100, source: 'website-research' } }); }
        if (intelligence.score >= 60) { qualified++; const createDraft = async (channel: OutreachChannel, message: string) => { const existingDraft = await prisma.outreach.findFirst({ where: { leadId: lead!.id, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED, OutreachStatus.SENT] } }, orderBy: { createdAt: 'desc' } }); if (!existingDraft) await prisma.outreach.create({ data: { leadId: lead!.id, campaignId, channel, status: OutreachStatus.APPROVAL_REQUIRED, message } }); }; if (lead.whatsapp) await createDraft(OutreachChannel.WHATSAPP, buildPersonalizedPitch({ businessName, requirement: intelligence.requirement, service: intelligence.service, findings: intelligence.findings })); if (email) await createDraft(OutreachChannel.EMAIL, buildPersonalizedPitch({ businessName, requirement: intelligence.requirement, service: intelligence.service, findings: intelligence.findings, email: true })); }
        successful++; processed++;
      } catch (error) { failed++; processed++; console.error(`[CAMPAIGN LEAD ERROR] ${result.name}`, error); }
      await prisma.campaign.update({ where: { id: campaignId }, data: { processedLeads: processed, successfulLeads: successful, failedLeads: failed } });
    }
    await prisma.$transaction([prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.COMPLETED, completedAt: new Date(), result: { discovered: searchResult.count, processed, successful, failed, qualified } } }),prisma.campaign.update({ where: { id: campaignId }, data: { status: failed > 0 ? CampaignStatus.PARTIALLY_COMPLETED : CampaignStatus.COMPLETED, completedAt: new Date(), totalLeads: searchResult.count, processedLeads: processed, successfulLeads: successful, failedLeads: failed } })]);
    return { success: true, campaignId, discovered: searchResult.count, processed, successful, failed, qualified };
  } catch (error) { await prisma.$transaction([prisma.job.update({ where: { id: job.id }, data: { status: JobStatus.FAILED, completedAt: new Date(), error: error instanceof Error ? error.message : String(error) } }),prisma.campaign.update({ where: { id: campaignId }, data: { status: CampaignStatus.FAILED, completedAt: new Date() } })]); throw error; }
}
