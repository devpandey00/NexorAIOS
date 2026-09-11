import { NextRequest, NextResponse } from 'next/server';
import { isAutomationEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 55;

async function authorized(req: NextRequest) {
  if (await authorizeMachineRequest(req)) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!await authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('autopilot'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'autopilot' });
  try {
    // Keep this endpoint orchestration-only. Scheduled outreach is already handled by
    // the dedicated production worker, preventing duplicate sends and 60s timeouts.
    const { runAutopilot } = await import('@/lib/autopilot-runner');
    const autopilot = await runAutopilot();
    return NextResponse.json({ ...autopilot, scheduledOutreach: { delegated: true } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
