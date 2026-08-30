import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceLearning } from '@/lib/social-intelligence';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10');
    const performance = await getPerformanceLearning(limit);
    const winner = performance[0] ?? null;
    return NextResponse.json({
      success: true,
      performance,
      recommendations: winner
        ? [`Prioritize ${winner.platform} while it leads on stored engagement data.`, 'Compare formats and hooks using post-level analytics before increasing volume.', 'Do not infer performance where no real analytics snapshots exist.']
        : ['No analytics snapshots are stored yet. Connect a provider and ingest real post metrics before making performance recommendations.'],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
