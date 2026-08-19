import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';
import { campaignPlannerService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { campaignService, assessLead, buildPersonalizedPitch } from '@nexor/core';
import { runCampaign } from './campaign-runner';
import { createSocialContent } from './social-content';
import { discoverOpportunities } from './opportunities';
import { verifyWhatsAppNumber } from './whatsapp-sender';

const prisma = getDatabaseClients().write;

async function autoSend(outreachId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  if (!base) return { sent: false, error: 'APP URL is not configured' };
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.OUTREACH_API_SECRET) headers.authorization = `Bearer ${process.env.OUTREACH_API_SECRET}`;
  const response = await fetch(`${base}/api/outreach/send`, { method: 'POST', headers, body: JSON.stringify({ id: outreachId }), cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  return { sent: Boolean(response.ok && data.success), error: data.error as string | undefined };
}

async function processExistingLeadBatch() {
  const batchSize = Math.min(Math.max(Number(process.env.AUTOPILOT_RESEARCH_BATCH_SIZE ?? 5), 1), 10);
  const leads = await prisma.lead.findMany({ where: { status: { in: [LeadStatus.NEW, LeadStatus.RESEARCHED] }, whatsapp: { not: null } }, orderBy: { updatedAt: 'asc' }, take: batchSize });
  let researched = 0;
  let qualified = 0;
  let verified = 0;
  let drafted = 0;
  let sent = 0;
  const errors: string[] = [];

  for (const lead of leads) {
    try {
      let intelligence: ReturnType<typeof assessLead> | null = null;
      let research: unknown = null;
      if (lead.website) {
        const result = await researchService.analyze(lead.website);
        research = result;
        if (result.success) {
          intelligence = assessLead({ website: result.website, technology: result.technology, social: Object.fromEntries(Object.entries(result.social ?? {})), seo: Object.fromEntries(Object.entries(result.seo ?? {})) });
          researched++;
        }
      }

      const score = intelligence?.score ?? lead.auditScore ?? 50;
      const requirement = intelligence?.requirement ?? (lead.website ? 'conversion optimisation' : 'new website');
      const service = intelligence?.service ?? (lead.website ? 'website redesign + Google & Meta Ads' : 'website development + Google & Meta Ads');
      const findings = intelligence?.findings ?? ['Online presence needs a stronger patient/customer acquisition journey.'];
      const message = buildPersonalizedPitch({ businessName: lead.businessName, requirement, service, findings });
      const whatsappVerified = await verifyWhatsAppNumber(lead.whatsapp ?? '');
      if (whatsappVerified) verified++;
      if (score >= 70) qualified++;

      await prisma.lead.update({ where: { id: lead.id }, data: { auditScore: score, status: score >= 70 ? LeadStatus.QUALIFIED : LeadStatus.RESEARCHED, notes: JSON.stringify({ autopilot: true, whatsappVerified, verifiedAt: new Date().toISOString(), research, intelligence }) } });
      if (!whatsappVerified) continue;

      const existing = await prisma.outreach.findFirst({ where: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: { notIn: [OutreachStatus.CANCELLED, OutreachStatus.FAILED] } } });
      if (existing) continue;

      const autoSendEnabled = process.env.AUTOPILOT_AUTO_SEND_WHATSAPP === 'true' && Boolean(process.env.WHATSAPP_ACCESS_TOKEN) && Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) && Boolean(process.env.WHATSAPP_TEMPLATE_NAME);
      const outreach = await prisma.outreach.create({ data: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: autoSendEnabled ? OutreachStatus.APPROVED : OutreachStatus.APPROVAL_REQUIRED, message } });
      drafted++;
      if (autoSendEnabled) {
        const result = await autoSend(outreach.id);
        if (result.sent) sent++;
        else errors.push(`${lead.businessName}: ${result.error ?? 'send failed'}`);
      }
    } catch (error) {
      errors.push(`${lead.businessName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { processed: leads.length, researched, qualified, verified, drafted, sent, errors };
}

export async function runAutopilot() {
  const startedAt = Date.now();
  const batchSize = Math.min(Math.max(Number(process.env.AUTO_DISCOVERY_BATCH_SIZE ?? 3), 1), 5);
  const plans = campaignPlannerService.planBatch(Math.floor(Date.now() / (60 * 60 * 1000)) * batchSize, batchSize);
  const campaigns = [];
  for (const plan of plans) {
    const existing = await prisma.campaign.findFirst({ where: { query: plan.query, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true } });
    if (existing) { campaigns.push({ ...plan, campaignId: existing.id, skipped: true }); continue; }
    const campaign = await campaignService.create({ name: `Autopilot ${plan.industry} — ${plan.location} — ${plan.service}`, query: plan.query });
    await campaignService.createDiscoveryJob(campaign.id);
    const result = await runCampaign(campaign.id);
    campaigns.push({ ...plan, campaignId: campaign.id, result, skipped: false });
  }

  const leadAutomation = await processExistingLeadBatch();
  const socialDrafts: string[] = [];
  if (process.env.AUTOPILOT_SOCIAL_DRAFTS !== 'false') {
    for (const platform of ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const) {
      const post = await createSocialContent({ platform, status: 'DRAFT', title: `${platform} growth post`, caption: 'Share one practical digital-growth insight for business owners, with a clear call to action and no invented claims.', hashtags: ['#DigitalMarketing', '#LeadGeneration', '#NexorMedia'] });
      socialDrafts.push(post.id);
    }
  }

  const opportunities = { jobs: await discoverOpportunities('JOB', process.env.AUTOPILOT_JOB_LOCATION, 5), companies: await discoverOpportunities('COMPANY', process.env.AUTOPILOT_COMPANY_LOCATION, 5), influencers: await discoverOpportunities('INFLUENCER', process.env.AUTOPILOT_INFLUENCER_LOCATION, 5) };
  let opportunityDrafts = 0;
  for (const item of [...opportunities.companies, ...opportunities.influencers]) {
    const existingLead = await prisma.lead.findFirst({ where: { website: item.url } });
    const lead = existingLead ?? await prisma.lead.create({ data: { businessName: item.title, niche: item.kind === 'INFLUENCER' ? 'influencer' : 'company prospect', country: item.location ?? 'Unknown', website: item.url } });
    let message = item.kind === 'INFLUENCER' ? `Hi ${item.title}, I came across your work and think there may be a strong collaboration opportunity with Nexor Media. I would love to share a simple idea tailored to your audience.` : `Hi ${item.title}, I came across your business while researching companies that could benefit from stronger digital acquisition. I have a few specific ideas around lead generation and growth that I can share.`;
    try {
      const research = await researchService.analyze(item.url);
      if (research.success) {
        const intelligence = assessLead({ website: research.website, technology: research.technology, social: Object.fromEntries(Object.entries(research.social ?? {})), seo: Object.fromEntries(Object.entries(research.seo ?? {})) });
        await prisma.lead.update({ where: { id: lead.id }, data: { auditScore: intelligence.score, notes: JSON.stringify({ research, intelligence }) } });
        message = buildPersonalizedPitch({ businessName: item.title, requirement: intelligence.requirement, service: intelligence.service, findings: intelligence.findings });
      }
    } catch { /* Keep discovery usable when a target blocks research. */ }
    const existingDraft = await prisma.outreach.findFirst({ where: { leadId: lead.id, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } } });
    if (!existingDraft) { await prisma.outreach.create({ data: { leadId: lead.id, channel: lead.email ? OutreachChannel.EMAIL : OutreachChannel.WHATSAPP, status: OutreachStatus.DRAFT, message } }); opportunityDrafts++; }
  }

  return { success: true, durationMs: Date.now() - startedAt, leadAutomation, campaigns, socialDrafts, opportunities, opportunityDrafts };
}
