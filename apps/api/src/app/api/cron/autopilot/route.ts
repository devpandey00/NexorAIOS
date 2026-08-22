import { NextRequest, NextResponse } from 'next/server';
import { OutreachStatus } from '@nexor/database';
import { runAutopilot } from '@/lib/autopilot-runner';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function processScheduledOutreach() {
  const { getDatabaseClients } = await import('@nexor/database');
  const prisma = getDatabaseClients().write;
  const perRun = Math.min(Math.max(Number(process.env.OUTREACH_MAX_PER_RUN ?? 2), 1), 20);
  const minDelayMs = Math.max(Number(process.env.OUTREACH_MIN_DELAY_MS ?? 2000), 0);
  const scheduled = await prisma.outreach.findMany({ where: { status: OutreachStatus.SCHEDULED, scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take: perRun });
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const item of scheduled) {
    const claimed = await prisma.outreach.updateMany({ where: { id: item.id, status: OutreachStatus.SCHEDULED }, data: { status: OutreachStatus.APPROVED, error: null } });
    if (claimed.count !== 1) continue;
    try {
      await sendApprovedOutreach(item.id);
      results.push({ id: item.id, success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.outreach.update({ where: { id: item.id }, data: { status: OutreachStatus.FAILED, error: message } }).catch(() => undefined);
      results.push({ id: item.id, success: false, error: message });
    }
    if (minDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, minDelayMs));
  }

  return { queued: scheduled.length, sent: results.filter((item) => item.success).length, failed: results.filter((item) => !item.success).length, results };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const [autopilot, outreach] = await Promise.all([runAutopilot(), processScheduledOutreach()]);
    return NextResponse.json({ ...autopilot, scheduledOutreach: outreach });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
