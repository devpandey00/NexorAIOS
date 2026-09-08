import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getReportSummary, sendNexorReportEmail } from '@/lib/email-reporting';
import { isAutomationEnabled } from '@/lib/automation-settings';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

const MILESTONES = [
  ['leads', 'Qualified leads', 50],
  ['emails', 'Emails sent', 50],
  ['whatsapp', 'WhatsApp messages sent', 50],
  ['social', 'Social posts published', 50],
  ['replies', 'Replies', 10],
  ['meetings', 'Meetings', 5],
  ['won', 'Clients won', 1],
] as const;

type MilestoneState = Record<string, number>;

function htmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');
}

async function sendMilestone(subject: string, lines: string[]) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.REPORT_FROM_EMAIL?.trim();
  const to = process.env.REPORT_EMAIL_TO?.trim();
  if (!apiKey || !from || !to) throw new Error('RESEND_API_KEY, REPORT_FROM_EMAIL and REPORT_EMAIL_TO are required for growth reports');
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:28px"><div style="letter-spacing:2px;font-size:11px;color:#a87928;font-weight:700">NEXORAIOS · FOUNDER ALERT</div><h1 style="font-size:28px">${htmlEscape(subject)}</h1><div style="border-top:1px solid #eee;padding-top:16px">${lines.map((line) => `<p>${htmlEscape(line)}</p>`).join('')}</div></div>`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? `Milestone email failed (${response.status})`);
  return data?.id ?? null;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('growth_reports'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'growth_reports' });

  const db = getDatabaseClients().write;
  try {
    const rows = await db.$queryRawUnsafe<Array<{ config: unknown }>>(`SELECT config FROM public.automation_settings WHERE key = 'growth_reports' LIMIT 1`);
    const config = (rows[0]?.config && typeof rows[0].config === 'object' ? rows[0].config : {}) as { last3hAt?: string; milestones?: MilestoneState };
    const now = Date.now();
    const last3hAt = config.last3hAt ? new Date(config.last3hAt).getTime() : 0;
    const dueForThreeHour = !Number.isFinite(last3hAt) || now - last3hAt >= 3 * 60 * 60 * 1000;

    const countsRows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        (SELECT COUNT(*) FROM public.leads WHERE status = 'QUALIFIED') AS leads,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'EMAIL' AND status = 'SENT') AS emails,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'WHATSAPP' AND status = 'SENT') AS whatsapp,
        (SELECT COUNT(*) FROM public.content_posts WHERE status = 'PUBLISHED') AS social,
        (SELECT COUNT(*) FROM public.messages WHERE direction = 'INBOUND') AS replies,
        (SELECT COUNT(*) FROM public.meetings WHERE status IN ('BOOKED','COMPLETED')) AS meetings,
        (SELECT COUNT(*) FROM public.opportunities WHERE stage = 'WON') AS won
    `);
    const counts = countsRows[0] ?? {};
    const previous = config.milestones ?? {};
    const reached: Array<{ key: string; label: string; count: number; milestone: number }> = [];

    for (const [key, label, step] of MILESTONES) {
      const count = Number(counts[key] ?? 0);
      const level = Math.floor(count / step);
      if (level > (previous[key] ?? 0)) reached.push({ key, label, count, milestone: level * step });
    }

    const reportResult = dueForThreeHour ? await sendNexorReportEmail(3) : null;
    let milestoneMessageId: string | null = null;
    if (reached.length) {
      milestoneMessageId = await sendMilestone(
        `NexorAIOS milestone · ${reached.map((item) => `${item.milestone} ${item.label.toLowerCase()}`).join(' · ')}`,
        reached.map((item) => `${item.label}: ${item.count}. New milestone reached: ${item.milestone}.`),
      );
    }

    const nextState: MilestoneState = { ...previous };
    for (const [key, , step] of MILESTONES) nextState[key] = Math.floor(Number(counts[key] ?? 0) / step);
    await db.$executeRawUnsafe(`UPDATE public.automation_settings SET config = $1::jsonb, updated_at = NOW() WHERE key = 'growth_reports'`, JSON.stringify({ last3hAt: dueForThreeHour ? new Date().toISOString() : config.last3hAt ?? null, milestones: nextState }));

    return NextResponse.json({ success: true, threeHourReport: reportResult, milestones: reached, milestoneMessageId, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[GROWTH REPORT ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
