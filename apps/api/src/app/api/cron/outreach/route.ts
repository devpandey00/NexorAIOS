import { NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';

const prisma = getDatabaseClients().write;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const perRun = Math.min(Math.max(Number(process.env.OUTREACH_MAX_PER_RUN ?? 5), 1), 50);
  const minDelayMs = Math.max(Number(process.env.OUTREACH_MIN_DELAY_MS ?? 30000), 0);

  try {
    const scheduled = await prisma.outreach.findMany({
      where: { status: OutreachStatus.SCHEDULED, scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: perRun,
    });

    let sent = 0;
    let failed = 0;
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of scheduled) {
      const claimed = await prisma.outreach.updateMany({
        where: { id: item.id, status: OutreachStatus.SCHEDULED },
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

    return NextResponse.json({ success: true, queued: scheduled.length, sent, failed, results });
  } catch (error) {
    console.error('[CRON OUTREACH ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
