import { NextRequest, NextResponse } from 'next/server';
import { registerDefaultTools, runSalesMachineWorkflow } from '@nexor/tools';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query) return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });

    const markets = Array.isArray(body?.markets)
      ? body.markets.filter((market: unknown): market is string => typeof market === 'string' && market.trim().length > 0).map((market: string) => market.trim())
      : undefined;

    registerDefaultTools();

    const result = await runSalesMachineWorkflow({
      query,
      limit: typeof body?.limit === 'number' ? body.limit : 25,
      niche: typeof body?.niche === 'string' ? body.niche.trim() : undefined,
      country: typeof body?.country === 'string' ? body.country.trim() : undefined,
      markets,
      businessFit: typeof body?.businessFit === 'string' ? body.businessFit.trim() : undefined,
      growthSignals: typeof body?.growthSignals === 'string' ? body.growthSignals.trim() : undefined,
      channel: body?.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP',
      createDrafts: body?.createDrafts !== false,
    });

    return NextResponse.json({ ...result, durationMs: Date.now() - startedAt }, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
