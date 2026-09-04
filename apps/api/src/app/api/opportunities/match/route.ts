import { NextRequest, NextResponse } from 'next/server';
import { matchOpportunities } from '@/lib/opportunity-matcher';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((x: unknown): x is string => typeof x === 'string') : [];
    if (!keywords.length) return NextResponse.json({ success: false, error: 'keywords are required' }, { status: 400 });
    const kind = body.kind ? String(body.kind).toUpperCase() : undefined;
    if (kind && !['JOB', 'COMPANY', 'INFLUENCER'].includes(kind)) throw new Error('Invalid opportunity kind');
    const results = await matchOpportunities({ kind: kind as 'JOB' | 'COMPANY' | 'INFLUENCER' | undefined, keywords, location: body.location ? String(body.location) : null }, Number(body.limit || 50));
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
