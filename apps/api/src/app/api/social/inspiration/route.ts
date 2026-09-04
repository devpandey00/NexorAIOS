import { NextRequest, NextResponse } from 'next/server';
import { getCreativeProviderStatus, searchPinterestInspiration } from '@/lib/creative-inspiration';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('query')?.trim() || '';
    const limit = Number(req.nextUrl.searchParams.get('limit') || 12);
    if (!query) return NextResponse.json({ success: false, error: 'query is required', providers: getCreativeProviderStatus() }, { status: 400 });
    const configured = getCreativeProviderStatus();
    if (configured.pinterest === 'NOT_CONFIGURED') return NextResponse.json({ success: true, configured: false, inspiration: [], providers: configured, message: 'Pinterest is not configured. Add PINTEREST_ACCESS_TOKEN to enable official inspiration search.' });
    const inspiration = await searchPinterestInspiration(query, limit);
    return NextResponse.json({ success: true, configured: true, inspiration, providers: configured });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error), providers: getCreativeProviderStatus() }, { status: 502 });
  }
}
