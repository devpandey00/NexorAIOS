import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { campaignService } from '@nexor/core';
import { campaignPlannerService } from '@nexor/search';
import { runCampaign } from '@/lib/campaign-runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function getBatchSize() {
  const raw = Number(process.env.AUTO_DISCOVERY_BATCH_SIZE ?? '3');
  return Number.isFinite(raw) ? Math.max(1, Math.min(5, Math.floor(raw))) : 3;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const batchSize = getBatchSize();

  try {
    const prisma = getDatabaseClients().write;
    const rotationBase = Math.floor(Date.now() / (60 * 60 * 1000)) * batchSize;
    const plans = campaignPlannerService.planBatch(rotationBase, batchSize);
    const results: Array<{ plan: (typeof plans)[number]; campaignId?: string; result?: unknown; skipped?: boolean }> = [];

    for (const plan of plans) {
      const existing = await prisma.campaign.findFirst({
        where: {
          query: plan.query,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });

      if (existing) {
        results.push({ plan, campaignId: existing.id, skipped: true });
        continue;
      }

      const campaign = await campaignService.create({
        name: `Auto ${plan.industry} — ${plan.location} — ${plan.service}`,
        query: plan.query,
      });

      // runCampaign claims an existing queued discovery job. Create it here;
      // without this step auto campaigns are created but can never execute.
      await campaignService.createDiscoveryJob(campaign.id);

      const result = await runCampaign(campaign.id);
      results.push({ plan, campaignId: campaign.id, result, skipped: false });
    }

    return NextResponse.json({
      success: true,
      batchSize,
      durationMs: Date.now() - startedAt,
      results,
    });
  } catch (error) {
    console.error('[AUTO CAMPAIGN ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        batchSize,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
