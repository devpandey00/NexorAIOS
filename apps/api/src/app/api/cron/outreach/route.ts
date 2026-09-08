import { NextResponse } from 'next/server';
import { OutreachStatus } from '@nexor/database';
import { sendApprovedOutreach } from '@/lib/outreach-sender';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('outreach'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'outreach' });
  if (!(await isOutboundEnabled())) return NextResponse.json({ success: true, skipped: true, reason: 'OUTBOUND_PAUSED', capability: 'outreach' });

  const { getDatabaseClients } = await import('@nexor/database');
  const prisma = getDatabaseClients().write;
  const perRun = Math.min(Math.max(Number(process.env.OUTREACH_MAX_PER_RUN ?? 2), 1), 20);
  const minDelayMs = Math.max(Number(process.env.OUTREACH_MIN_DELAY_MS ?? 2000), 0);

  try {
    const now = new Date();
    const queued = await prisma.outreach.findMany({
      where: {
        OR: [
          { status: OutreachStatus.APPROVED, scheduledAt: { lte: now } },
          { status: OutreachStatus.SCHEDULED, scheduledAt: { lte: now } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
      take: perRun,
    });

    let sent = 0;
    let failed = 0;
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of queued) {
      if (!(await isOutboundEnabled())) break;
      const claimed = await prisma.outreach.updateMany({
        where: { id: item.id, status: { in: [OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } },
        data: { status: OutreachStatus.APPROVED, error: null },
      });
      if (claimed.count !== 1) continue;

      try {
        await sendApprovedOutreach(item.id);
        sent++;
        results.push({ id: item.id, success: true });
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        await prisma.outreach.update({ where: { id: item.id }, data: { status: OutreachStatus.FAILED, error: message } }).catch(() => undefined);
        results.push({ id: item.id, success: false, error: message });
      }

      if (minDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, minDelayMs));
    }

    return NextResponse.json({ success: true, queued: queued.length, sent, failed, results, outboundEnabled: await isOutboundEnabled() });
  } catch (error) {
    console.error('[CRON OUTREACH ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
