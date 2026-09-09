import { NextRequest, NextResponse } from 'next/server';
import { CampaignStatus, getDatabaseClients, JobStatus } from '@nexor/database';
import { runCampaign } from '@/lib/campaign-runner';
import { isAutomationEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('campaign_discovery'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'campaign_discovery' });

  const db = getDatabaseClients().write;
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);

  try {
    // Recover work abandoned by a timed-out function invocation.
    await db.campaign.updateMany({
      where: { status: CampaignStatus.RUNNING, startedAt: { lt: staleBefore } },
      data: { status: CampaignStatus.QUEUED, startedAt: null },
    });
    await db.job.updateMany({
      where: { status: JobStatus.RUNNING, startedAt: { lt: staleBefore } },
      data: { status: JobStatus.QUEUED, startedAt: null },
    });

    const candidates = await db.campaign.findMany({
      where: { status: CampaignStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { id: true, name: true },
    });

    for (const candidate of candidates) {
      const job = await db.job.findFirst({
        where: { campaignId: candidate.id, status: JobStatus.QUEUED },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!job) continue;

      // Campaign state is the durable claim. runCampaign then owns the job state transition.
      const claimed = await db.campaign.updateMany({
        where: { id: candidate.id, status: CampaignStatus.QUEUED },
        data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
      });
      if (claimed.count !== 1) continue;

      const startedAt = Date.now();
      try {
        const result = await runCampaign(candidate.id);
        return NextResponse.json({ success: true, campaign: candidate, durationMs: Date.now() - startedAt, result });
      } catch (error) {
        return NextResponse.json({
          success: false,
          campaign: candidate,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, claimed: false, message: 'No queued campaign with a queued discovery job.' });
  } catch (error) {
    console.error('[CAMPAIGN WORKER ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
