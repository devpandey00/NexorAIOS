import { NextRequest, NextResponse } from 'next/server';
import { sendNexorReportEmail } from '@/lib/email-reporting';
import { isAutomationEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function authorized(req: NextRequest) {
  if (await authorizeMachineRequest(req)) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('daily_reports'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'daily_reports' });
  try { return NextResponse.json(await sendNexorReportEmail(24)); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
