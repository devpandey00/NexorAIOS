import { NextRequest, NextResponse } from 'next/server';
import { createSocialContent, listSocialContent, type SocialContentPlatform, type SocialContentStatus } from '@/lib/social-content';

export const runtime = 'nodejs';

const PLATFORMS: SocialContentPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];
const STATUSES: SocialContentStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

export async function GET(req: NextRequest) {
  try {
    const platform = req.nextUrl.searchParams.get('platform') ?? undefined;
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100');

    const posts = await listSocialContent({ platform, status, limit });
    return NextResponse.json({ success: true, count: posts.length, posts });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platform = String(body.platform ?? '').toUpperCase() as SocialContentPlatform;
    const status = String(body.status ?? 'DRAFT').toUpperCase() as SocialContentStatus;
    const title = String(body.title ?? '').trim();
    const caption = String(body.caption ?? '').trim();

    if (!PLATFORMS.includes(platform)) throw new Error('Invalid social platform');
    if (!STATUSES.includes(status)) throw new Error('Invalid content status');
    if (!title || !caption) throw new Error('title and caption are required');

    const hashtags = Array.isArray(body.hashtags)
      ? body.hashtags.filter((value: unknown): value is string => typeof value === 'string').slice(0, 30)
      : [];

    const post = await createSocialContent({
      platform,
      status,
      title,
      caption,
      hashtags,
      mediaUrl: typeof body.mediaUrl === 'string' ? body.mediaUrl : null,
      scheduledAt: typeof body.scheduledAt === 'string' ? body.scheduledAt : null,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
