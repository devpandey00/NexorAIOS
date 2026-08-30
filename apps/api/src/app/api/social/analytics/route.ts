import { NextRequest, NextResponse } from 'next/server';
import { listAnalytics, recordAnalytics } from '@/lib/social-intelligence';

export const runtime = 'nodejs';

const integerFields = ['reach', 'impressions', 'likes', 'comments', 'shares', 'saves', 'clicks', 'views', 'followers'] as const;

function nonNegativeInteger(value: unknown, field: string) {
  if (value == null) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${field} must be a non-negative integer`);
  return number;
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      snapshots: await listAnalytics({
        platform: req.nextUrl.searchParams.get('platform') ?? undefined,
        postId: req.nextUrl.searchParams.get('postId') ?? undefined,
        limit: Number(req.nextUrl.searchParams.get('limit') ?? '200'),
      }),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platform = String(body.platform ?? '').trim().toUpperCase();
    if (!platform) throw new Error('platform is required');
    const values: Record<string, number | null> = {};
    for (const field of integerFields) values[field] = nonNegativeInteger(body[field], field);
    const engagementRate = body.engagementRate == null ? null : Number(body.engagementRate);
    if (engagementRate != null && (!Number.isFinite(engagementRate) || engagementRate < 0)) throw new Error('engagementRate must be a non-negative number');
    const snapshot = await recordAnalytics({
      platform, postId: typeof body.postId === 'string' ? body.postId : null,
      externalId: typeof body.externalId === 'string' ? body.externalId : null,
      snapshotAt: typeof body.snapshotAt === 'string' ? body.snapshotAt : undefined,
      ...values,
      engagementRate,
      raw: body.raw && typeof body.raw === 'object' ? body.raw : {},
    });
    return NextResponse.json({ success: true, snapshot }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
