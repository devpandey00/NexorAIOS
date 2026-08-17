import { NextRequest, NextResponse } from 'next/server';
import { sendNexorReportEmail, getReportSummary } from '@/lib/email-reporting';
import { sendWhatsAppReport } from '@/lib/report-notifications';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const requestedHours = Number(req.nextUrl.searchParams.get('hours') ?? 24);
  const periodHours = Number.isFinite(requestedHours) ? Math.min(Math.max(Math.round(requestedHours), 1), 168) : 24;

  try {
    const summary = await getReportSummary(periodHours);
    const [email, whatsapp] = await Promise.allSettled([
      sendNexorReportEmail(periodHours),
      sendWhatsAppReport(summary),
    ]);

    const emailResult = email.status === 'fulfilled'
      ? email.value
      : { success: false, error: email.reason instanceof Error ? email.reason.message : String(email.reason) };
    const whatsappResult = whatsapp.status === 'fulfilled'
      ? whatsapp.value
      : { success: false, error: whatsapp.reason instanceof Error ? whatsapp.reason.message : String(whatsapp.reason) };

    return NextResponse.json({
      success: Boolean(emailResult.success || whatsappResult.success),
      periodHours,
      summary,
      email: emailResult,
      whatsapp: whatsappResult,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
