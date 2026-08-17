import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { campaignPlannerService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { campaignService, assessLead, buildPersonalizedPitch } from '@nexor/core';
import { runCampaign } from './campaign-runner';
import { createSocialContent } from './social-content';
import { discoverOpportunities } from './opportunities';

const prisma = getDatabaseClients().write;

function firstValidEmail(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const email = value.find((item): item is string => typeof item === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.trim()));
  return email?.trim().toLowerCase() ?? null;
}

function firstValidPhone(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const phone = value.find((item): item is string => {
    if (typeof item !== 'string') return false;
    const digits = item.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  });
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export async function runAutopilot() {
  const startedAt = Date.now();
  const batchSize = Math.min(Math.max(Number(process.env.AUTO_DISCOVERY_BATCH_SIZE ?? 3), 1), 5);
  const base = Math.floor(Date.now() / (60 * 60 * 1000)) * batchSize;
  const plans = campaignPlannerService.planBatch(base, batchSize);
  const campaigns = [];

  for (const plan of plans) {
    const existing = await prisma.campaign.findFirst({ where: { query: plan.query, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, select: { id: true } });
    if (existing) {
      campaigns.push({ ...plan, campaignId: existing.id, skipped: true });
      continue;
    }

    const campaign = await campaignService.create({
      name: `Autopilot ${plan.industry} — ${plan.location} — ${plan.service}`,
      query: plan.query,
    });

    await campaignService.createDiscoveryJob(campaign.id);

    const result = await runCampaign(campaign.id);
    campaigns.push({ ...plan, campaignId: campaign.id, result, skipped: false });
  }

  const socialDrafts = [] as string[];
  if (process.env.AUTOPILOT_SOCIAL_DRAFTS !== 'false') {
    for (const platform of ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const) {
      const post = await createSocialContent({
        platform,
        status: 'DRAFT',
        title: `${platform} growth post`,
        caption: 'Share one practical digital-growth insight for business owners, with a clear call to action and no invented claims.',
        hashtags: ['#DigitalMarketing', '#LeadGeneration', '#NexorMedia'],
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
    const lead = existingLead ?? await prisma.lead.create({
      data: {
        businessName: item.title,
        niche: item.kind === 'INFLUENCER' ? 'influencer' : 'company prospect',
        country: item.location ?? 'Unknown',
        website: item.url,
      },
    });

    let message = item.kind === 'INFLUENCER'
      ? `Hi ${item.title}, I came across your work and think there may be a strong collaboration opportunity with Nexor Media. I would love to share a simple idea tailored to your audience.`
      : `Hi ${item.title}, I came across your business while researching companies that could benefit from stronger digital acquisition. I have a few specific ideas around lead generation and growth that I can share.`;

    try {
      const research = await researchService.analyze(item.url);
      if (research.success) {
        const intelligence = assessLead({
          website: research.website,
          technology: research.technology,
          social: Object.fromEntries(Object.entries(research.social ?? {})),
          seo: Object.fromEntries(Object.entries(research.seo ?? {})),
        });
        const contacts = (research as unknown as { contacts?: { emails?: unknown; phones?: unknown } }).contacts;
        const email = firstValidEmail(contacts?.emails);
        const phone = firstValidPhone(contacts?.phones);
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            email: lead.email ?? email,
            whatsapp: lead.whatsapp ?? phone,
            auditScore: intelligence.score,
            notes: JSON.stringify({ research, intelligence }),
          },
        });
        if (!lead.email && email) lead.email = email;
        if (!lead.whatsapp && phone) lead.whatsapp = phone;
        message = buildPersonalizedPitch({ businessName: item.title, requirement: intelligence.requirement, service: intelligence.service, findings: intelligence.findings });
      }
    } catch {
      // Discovery remains usable when a target blocks research.
    }

    const channel = lead.whatsapp ? OutreachChannel.WHATSAPP : lead.email ? OutreachChannel.EMAIL : null;
    if (!channel) continue;

    const existingDraft = await prisma.outreach.findFirst({
      where: {
        leadId: lead.id,
        status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] },
      },
    });

    if (!existingDraft) {
      await prisma.outreach.create({
        data: {
          leadId: lead.id,
          channel,
          status: OutreachStatus.DRAFT,
          message,
        },
      });
      opportunityDrafts++;
    }
  }

  return { success: true, durationMs: Date.now() - startedAt, campaigns, socialDrafts, opportunities, opportunityDrafts };
}
