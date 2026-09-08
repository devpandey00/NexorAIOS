import { NextRequest, NextResponse } from 'next/server';
import { createSocialContent, listSocialContent, type SocialContentPlatform, type SocialContentStatus } from '@/lib/social-content';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const PLATFORMS: SocialContentPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];
const STATUSES: SocialContentStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

async function requireSession(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireSession(req);
    const platform = req.nextUrl.searchParams.get('platform') ?? undefined;
    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '100');
    const posts = await listSocialContent({ platform, status, limit });
    return NextResponse.json({ success: true, count: posts.length, posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSession(req);
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
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
