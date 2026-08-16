import { NextRequest, NextResponse } from 'next/server';
import { sendNexorReportEmail } from '@/lib/email-reporting';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const periodHours = Math.min(Math.max(Number(body.periodHours ?? 24), 1), 168);
    return NextResponse.json(await sendNexorReportEmail(periodHours));
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
