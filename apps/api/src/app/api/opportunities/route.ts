import { NextRequest, NextResponse } from 'next/server';
import { discoverOpportunities, listOpportunities, type OpportunityKind } from '@/lib/opportunities';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 120;

const KINDS: OpportunityKind[] = ['JOB', 'COMPANY', 'INFLUENCER'];

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const kind = req.nextUrl.searchParams.get('kind') as OpportunityKind | null;
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100');
    if (kind && !KINDS.includes(kind)) throw new Error('Invalid opportunity kind');
    const opportunities = await listOpportunities({ kind: kind ?? undefined, status, limit });
    return NextResponse.json({ success: true, count: opportunities.length, opportunities });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const kind = String(body.kind ?? 'COMPANY').toUpperCase() as OpportunityKind;
    const location = typeof body.location === 'string' ? body.location.trim() : undefined;
    const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);
    if (!KINDS.includes(kind)) throw new Error('kind must be JOB, COMPANY or INFLUENCER');
    const opportunities = await discoverOpportunities(kind, location, limit);
    return NextResponse.json({ success: true, count: opportunities.length, opportunities });
  } catch (error) {
    console.error('[OPPORTUNITY HUNTER API ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
