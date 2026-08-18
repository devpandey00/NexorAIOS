import { randomUUID } from 'node:crypto';
import { getDatabaseClients, OutreachChannel, OutreachStatus, JobStatus } from '@nexor/database';
import { campaignPlannerService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { campaignService, assessLead, buildPersonalizedPitch } from '@nexor/core';
import { runCampaign } from './campaign-runner';
import { createSocialContent } from './social-content';
import { discoverOpportunities } from './opportunities';

const WORKFLOW_NAME = 'NexorAIOS 2-hour prospecting';
const WORKFLOW_CRON = '0 */2 * * *';

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

async function getOrCreateSchedule(prisma: ReturnType<typeof getDatabaseClients>['write']) {
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string; run_count: number }>>(
    `SELECT "id", "run_count" FROM "public"."automation_schedules" WHERE "name" = $1 AND "workflow" = 'sales_machine' AND "status" = 'ACTIVE' ORDER BY "created_at" ASC LIMIT 1`,
    WORKFLOW_NAME,
  );

  if (existing[0]) return existing[0];

  const id = randomUUID();
  await prisma.$queryRawUnsafe(
    `INSERT INTO "public"."automation_schedules" ("id","name","workflow","input","cron","timezone","status","next_run_at","created_at","updated_at") VALUES ($1::uuid,$2,'sales_machine',$3::jsonb,$4,'UTC','ACTIVE',NOW() + INTERVAL '2 hours',NOW(),NOW())`,
    id,
    WORKFLOW_NAME,
    JSON.stringify({ cadenceHours: 2 }),
    WORKFLOW_CRON,
  );
  return { id, run_count: 0 };
}

export async function runAutopilot() {
  const prisma = getDatabaseClients().write;
  const startedAt = Date.now();
  const schedule = await getOrCreateSchedule(prisma);
  const runId = randomUUID();

  await prisma.$queryRawUnsafe(
    `INSERT INTO "public"."automation_runs" ("id","schedule_id","status","input","started_at","created_at") VALUES ($1::uuid,$2::uuid,'RUNNING',$3::jsonb,NOW(),NOW())`,
    runId,
    schedule.id,
    JSON.stringify({ cadenceHours: 2, startedAt: new Date().toISOString() }),
  );

  try {
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
          channel,
          status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] },
        },
      });

      if (!existingDraft) {
        await prisma.outreach.create({
          data: {
            leadId: lead.id,
            channel,
            status: OutreachStatus.APPROVAL_REQUIRED,
            message,
          },
        });
        opportunityDrafts++;
      }
    }

    const output = {
      success: true,
      runId,
      durationMs: Date.now() - startedAt,
      campaigns,
      socialDrafts,
      opportunities,
      opportunityDrafts,
    };

    await prisma.$queryRawUnsafe(
      `UPDATE "public"."automation_runs" SET "status"='COMPLETED',"output"=$1::jsonb,"completed_at"=NOW() WHERE "id"=$2::uuid`,
      JSON.stringify(output),
      runId,
    );
    await prisma.$queryRawUnsafe(
      `UPDATE "public"."automation_schedules" SET "last_run_at"=NOW(),"next_run_at"=NOW() + INTERVAL '2 hours',"run_count"="run_count"+1,"last_error"=NULL,"updated_at"=NOW() WHERE "id"=$1::uuid`,
      schedule.id,
    );

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.$queryRawUnsafe(
      `UPDATE "public"."automation_runs" SET "status"='FAILED',"error"=$1,"completed_at"=NOW() WHERE "id"=$2::uuid`,
      message,
      runId,
    ).catch(() => undefined);
    await prisma.$queryRawUnsafe(
      `UPDATE "public"."automation_schedules" SET "last_run_at"=NOW(),"next_run_at"=NOW() + INTERVAL '2 hours',"run_count"="run_count"+1,"last_error"=$1,"status"='FAILED',"updated_at"=NOW() WHERE "id"=$2::uuid`,
      message,
      schedule.id,
    ).catch(() => undefined);
    throw error;
  }
}
