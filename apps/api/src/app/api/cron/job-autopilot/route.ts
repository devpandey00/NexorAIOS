import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.OUTREACH_API_SECRET || '';
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  if (!secret && process.env.NODE_ENV === 'production') return NextResponse.json({ success: false, error: 'CRON_SECRET is required in production' }, { status: 503 });
  if (secret && supplied !== secret) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const base = new URL(req.url).origin;
  const response = await fetch(`${base}/api/job-autopilot`, { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { authorization: `Bearer ${secret}` } : {}) }, body: JSON.stringify({ mode: 'run', limit: 10 }), cache: 'no-store' });
  const data = await response.json().catch(() => ({ success: false, error: 'Worker returned invalid JSON' }));
  return NextResponse.json(data, { status: response.status });
}
