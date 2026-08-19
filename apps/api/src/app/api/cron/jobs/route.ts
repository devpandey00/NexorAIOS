import { NextRequest, NextResponse } from 'next/server';
import { discoverOpportunities } from '@/lib/opportunities';

export const runtime = 'nodejs';
export const maxDuration = 120;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const location = process.env.JOB_SEARCH_LOCATION || 'Remote India';
    const limit = Math.min(Math.max(Number(process.env.JOB_SEARCH_LIMIT ?? 20), 1), 50);
    const opportunities = await discoverOpportunities('JOB', location, limit);
    return NextResponse.json({ success: true, location, count: opportunities.length, opportunities });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
