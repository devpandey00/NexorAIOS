import { NextRequest, NextResponse } from 'next/server';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';

async function authorized(req: NextRequest) {
  if (await authorizeMachineRequest(req)) return true;
  const secret = process.env.CRON_SECRET || process.env.OUTREACH_API_SECRET || '';
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  return Boolean(secret && supplied === secret);
}

export async function GET(req: NextRequest) {
  if (!await authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const base = new URL(req.url).origin;
  const machineToken = req.headers.get('x-nexor-machine-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const response = await fetch(`${base}/api/job-autopilot`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(machineToken ? { 'x-nexor-machine-token': machineToken, authorization: `Bearer ${machineToken}` } : {}) },
    body: JSON.stringify({ mode: 'run', limit: 10 }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({ success: false, error: 'Worker returned invalid JSON' }));
  return NextResponse.json(data, { status: response.status });
}
