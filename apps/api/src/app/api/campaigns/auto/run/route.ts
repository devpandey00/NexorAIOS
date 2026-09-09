import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { campaignService } from '@nexor/core';
import { campaignPlannerService } from '@nexor/search';
import { isAutomationEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

function getBatchSize() {
  const raw = Number(process.env.AUTO_DISCOVERY_BATCH_SIZE ?? '3');
  return Number.isFinite(raw) ? Math.max(1, Math.min(3, Math.floor(raw))) : 3;
}

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('campaign_discovery'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'campaign_discovery' });

  const startedAt = Date.now();
  const batchSize = getBatchSize();

  try {
    const prisma = getDatabaseClients().write;
    const rotationBase = Math.floor(Date.now() / (60 * 60 * 1000)) * batchSize;
    const plans = campaignPlannerService.planBatch(rotationBase, batchSize);
    const queued: Array<{ plan: (typeof plans)[number]; campaignId?: string; skipped?: boolean }> = [];

    for (const plan of plans) {
      const existing = await prisma.campaign.findFirst({
        where: { query: plan.query, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { id: true },
      });
      if (existing) {
        queued.push({ plan, campaignId: existing.id, skipped: true });
        continue;
      }

      const campaign = await campaignService.create({
        name: `Auto ${plan.industry} — ${plan.location} — ${plan.service}`,
        query: plan.query,
      });
      await campaignService.createDiscoveryJob(campaign.id);
      queued.push({ plan, campaignId: campaign.id, skipped: false });
    }

    return NextResponse.json({
      success: true,
      queued: queued.filter((item) => !item.skipped).length,
      batchSize,
      durationMs: Date.now() - startedAt,
      results: queued,
      note: 'Discovery is queued for the campaign worker; this endpoint no longer performs long-running research inline.',
    });
  } catch (error) {
    console.error('[AUTO CAMPAIGN QUEUE ERROR]', error);
    return NextResponse.json({ success: false, batchSize, durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
