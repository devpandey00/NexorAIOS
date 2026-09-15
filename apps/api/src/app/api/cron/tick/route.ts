import { NextRequest, NextResponse } from 'next/server';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Single production heartbeat for Vercel Cron.
 * It fans out to the durable scheduler plus bounded acquisition, follow-up,
 * outbound and social workers. Every worker keeps its own safety/automation gate.
 */
export async function GET(request: NextRequest) {
  if (!(await authorizeMachineRequest(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const origin = request.nextUrl.origin;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ success: false, error: 'CRON_SECRET is required for the production heartbeat' }, { status: 503 });
  }

  const headers = { authorization: `Bearer ${secret}`, 'x-cron-secret': secret };
  const jobs: Array<[string, Promise<Response>]> = [
    ['scheduler', fetch(`${origin}/api/automations/run`, { method: 'POST', headers })],
    ['campaign_discovery', fetch(`${origin}/api/cron/campaign-worker`, { headers, cache: 'no-store' })],
    ['followups', fetch(`${origin}/api/cron/followups`, { headers, cache: 'no-store' })],
    ['outreach', fetch(`${origin}/api/cron/outreach`, { headers, cache: 'no-store' })],
    ['social_publishing', fetch(`${origin}/api/cron/social-publish`, { headers, cache: 'no-store' })],
  ];

  const results = await Promise.allSettled(jobs.map(async ([name, requestPromise]) => {
    const response = await requestPromise;
    const body = await response.json().catch(() => ({ success: false, error: `Worker returned ${response.status}` }));
    return { worker: name, status: response.status, ok: response.ok, body };
  }));

  const normalized = results.map((result, index) => {
    const name = jobs[index][0];
    return result.status === 'fulfilled'
      ? result.value
      : { worker: name, status: 500, ok: false, body: { success: false, error: result.reason instanceof Error ? result.reason.message : String(result.reason) } };
  });

  return NextResponse.json({
    success: normalized.every((item) => item.ok || item.body?.skipped),
    heartbeatAt: new Date().toISOString(),
    workers: normalized,
  });
}
