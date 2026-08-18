import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';

export const runtime = 'nodejs';
export const maxDuration = 60;
const db = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const hours = Math.min(Math.max(Number(req.nextUrl.searchParams.get('hours') ?? 2), 1), 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const [leads, researched, drafts, scheduled, sent, failed, followups] = await Promise.all([
      db.lead.count({ where: { createdAt: { gte: since } } }),
      db.lead.count({ where: { updatedAt: { gte: since }, status: { in: ['RESEARCHED', 'QUALIFIED', 'PITCH_READY', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'PROPOSAL_SENT', 'WON', 'LOST'] } } }),
      db.outreach.count({ where: { createdAt: { gte: since }, status: OutreachStatus.DRAFT } }),
      db.outreach.count({ where: { createdAt: { gte: since }, status: OutreachStatus.SCHEDULED } }),
      db.outreach.count({ where: { sentAt: { gte: since }, status: OutreachStatus.SENT } }),
      db.outreach.count({ where: { updatedAt: { gte: since }, status: OutreachStatus.FAILED } }),
      db.followUp.count({ where: { scheduledAt: { gte: since } } }),
    ]);

    const summary = { periodHours: hours, leads, researched, drafts, scheduled, sent, failed, followups, generatedAt: new Date().toISOString() };
    const to = process.env.REPORT_EMAIL_TO;
    const from = process.env.REPORT_FROM_EMAIL ?? process.env.OUTREACH_FROM_EMAIL;
    let email: { success: boolean; id?: string; error?: string } = { success: false };

    if (to && from && process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [to], subject: `NexorAIOS ${hours}h Operations Report`, text: [`NexorAIOS ${hours}h Operations Report`, '', `New leads: ${leads}`, `Researched: ${researched}`, `Drafts: ${drafts}`, `Scheduled: ${scheduled}`, `Sent: ${sent}`, `Failed: ${failed}`, `Follow-ups: ${followups}`, '', `Generated: ${summary.generatedAt}`].join('\n') }),
      });
      const data = await response.json().catch(() => ({}));
      email = response.ok ? { success: true, id: data?.id } : { success: false, error: data?.message ?? `Email failed (${response.status})` };
    } else {
      email = { success: false, error: 'REPORT_EMAIL_TO, REPORT_FROM_EMAIL and RESEND_API_KEY are not configured' };
    }

    return NextResponse.json({ success: email.success, summary, email });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
