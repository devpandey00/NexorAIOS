import { NextRequest, NextResponse } from 'next/server';
import { generateSocialStrategy, listSocialStrategies } from '@/lib/social-strategy';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50');
    return NextResponse.json({ success: true, strategies: await listSocialStrategies(limit) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await generateSocialStrategy({
      trendId: typeof body.trendId === 'string' ? body.trendId : null,
      trendTopic: typeof body.trendTopic === 'string' ? body.trendTopic : null,
      trendOpportunity: typeof body.trendOpportunity === 'string' ? body.trendOpportunity : null,
      platform: String(body.platform ?? 'INSTAGRAM'),
      niche: String(body.niche ?? ''),
      goal: String(body.goal ?? ''),
      audience: String(body.audience ?? ''),
      offer: typeof body.offer === 'string' ? body.offer : null,
      targetMarket: typeof body.targetMarket === 'string' ? body.targetMarket : 'INTERNATIONAL',
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
