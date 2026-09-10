import { OutreachChannel, OutreachStatus } from '@nexor/database';
import { campaignPlannerService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { campaignService, assessLead, buildPersonalizedPitch } from '@nexor/core';
import { NEXOR_BRAND } from '@nexor/shared';
import { runCampaign } from './campaign-runner';
import { createSocialContent } from './social-content';
import { discoverOpportunities } from './opportunities';
import { buildSalesMessage } from './sales-message-engine';

export async function runAutopilot() {
  const { getDatabaseClients } = await import('@nexor/database');
  const prisma = getDatabaseClients().write;
  const startedAt = Date.now();
  const batchSize = Math.min(Math.max(Number(process.env.AUTO_DISCOVERY_BATCH_SIZE ?? 3), 1), 5);
  const base = Math.floor(Date.now() / (60 * 60 * 1000)) * batchSize;
  const plans = campaignPlannerService.planBatch(base, batchSize);
  const campaigns = [];

  for (const plan of plans) {
    const existing = await prisma.campaign.findFirst({ where: { query: plan.query, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true } });
    if (existing) { campaigns.push({ ...plan, campaignId: existing.id, skipped: true }); continue; }
    const campaign = await campaignService.create({ name: `Autopilot ${plan.industry} — ${plan.location} — ${plan.service}`, query: plan.query });
    await campaignService.createDiscoveryJob(campaign.id);
    const result = await runCampaign(campaign.id);
    campaigns.push({ ...plan, campaignId: campaign.id, result, skipped: false });
  }

  const socialDrafts: string[] = [];
  if (process.env.AUTOPILOT_SOCIAL_DRAFTS !== 'false') {
    for (const platform of ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const) {
      const post = await createSocialContent({
        platform,
        status: 'DRAFT',
        title: `${NEXOR_BRAND.name} ${platform} growth post`,
        caption: `Share one practical digital-growth insight for business owners, with a clear call to action and no invented claims. ${NEXOR_BRAND.name} helps businesses with ${NEXOR_BRAND.services.slice(0, 4).join(', ')}.`,
        hashtags: NEXOR_BRAND.defaultHashtags,
      });
      socialDrafts.push(post.id);
    }
  }

  const opportunities = {
    jobs: await discoverOpportunities('JOB', process.env.AUTOPILOT_JOB_LOCATION, 5),
    companies: await discoverOpportunities('COMPANY', process.env.AUTOPILOT_COMPANY_LOCATION, 5),
    influencers: await discoverOpportunities('INFLUENCER', process.env.AUTOPILOT_INFLUENCER_LOCATION, 5),
  };

  let opportunityDrafts = 0;
  for (const item of [...opportunities.companies, ...opportunities.influencers]) {
    const existingLead = await prisma.lead.findFirst({ where: { website: item.url } });
    const lead = existingLead ?? await prisma.lead.create({ data: { businessName: item.title, niche: item.kind === 'INFLUENCER' ? 'influencer' : 'company prospect', country: item.location ?? 'Unknown', website: item.url } });
    let message = buildSalesMessage({ businessName: item.title, country: item.location, channel: lead.email ? 'EMAIL' : 'WHATSAPP' });
    try {
      const research = await researchService.analyze(item.url);
      if (research.success) {
        const intelligence = assessLead({ website: research.website, technology: research.technology, social: Object.fromEntries(Object.entries(research.social ?? {})), seo: Object.fromEntries(Object.entries(research.seo ?? {})) });
        await prisma.lead.update({ where: { id: lead.id }, data: { auditScore: intelligence.score, notes: JSON.stringify({ research, intelligence }) } });
        message = buildPersonalizedPitch({ businessName: item.title, requirement: intelligence.requirement, service: intelligence.service, findings: intelligence.findings });
      }
    } catch { /* target research can fail without blocking discovery */ }

    const existingDraft = await prisma.outreach.findFirst({ where: { leadId: lead.id, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } } });
    if (!existingDraft) {
      await prisma.outreach.create({ data: { leadId: lead.id, channel: lead.email ? OutreachChannel.EMAIL : OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED, message } });
      opportunityDrafts++;
    }
  }

  return { success: true, durationMs: Date.now() - startedAt, campaigns, socialDrafts, opportunities, opportunityDrafts };
}
