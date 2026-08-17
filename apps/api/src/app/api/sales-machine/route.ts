import { NextRequest, NextResponse } from 'next/server';
import { runSalesMachineWorkflow } from '@nexor/tools';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    if (!query) return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });

    const result = await runSalesMachineWorkflow({
      query,
      limit: typeof body?.limit === 'number' ? body.limit : 25,
      niche: typeof body?.niche === 'string' ? body.niche : undefined,
      country: typeof body?.country === 'string' ? body.country : 'India',
      channel: body?.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP',
      createDrafts: body?.createDrafts !== false,
    });

    return NextResponse.json({ ...result, durationMs: Date.now() - startedAt }, { status: result.success ? 200 : 500 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
