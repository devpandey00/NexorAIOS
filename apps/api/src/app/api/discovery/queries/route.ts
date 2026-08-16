import { NextRequest, NextResponse } from 'next/server';
import { discoveryStrategyService } from '@nexor/core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(100, Math.floor(body.limit)))
      : 20;

    const result = discoveryStrategyService.createQueries({
      industries: Array.isArray(body.industries) ? body.industries.filter((value: unknown): value is string => typeof value === 'string') : undefined,
      locations: Array.isArray(body.locations) ? body.locations.filter((value: unknown): value is string => typeof value === 'string') : undefined,
      services: Array.isArray(body.services) ? body.services.filter((value: unknown): value is string => typeof value === 'string') : undefined,
      intents: Array.isArray(body.intents) ? body.intents.filter((value: unknown): value is string => typeof value === 'string') : undefined,
    }, limit);

    return NextResponse.json({ success: true, count: result.length, queries: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
