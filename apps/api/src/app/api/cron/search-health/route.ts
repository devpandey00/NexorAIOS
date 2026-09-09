import { NextRequest, NextResponse } from 'next/server';
import { serperSearch } from '@nexor/search';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get('q')?.trim() || 'digital marketing agencies in Dubai';
  if (query.length > 300) {
    return NextResponse.json({ success: false, error: 'Query is too long' }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const apiKeyConfigured = Boolean(process.env.SERPER_API_KEY?.trim());
    if (!apiKeyConfigured) {
      return NextResponse.json({
        success: false,
        provider: 'serper',
        configured: false,
        error: 'SERPER_API_KEY is not configured',
      }, { status: 503 });
    }

    const leads = await serperSearch(query);
    return NextResponse.json({
      success: true,
      provider: 'serper',
      configured: true,
      query,
      count: leads.length,
      leads: leads.slice(0, 10),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      provider: 'serper',
      configured: true,
      query,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 502 });
  }
}
