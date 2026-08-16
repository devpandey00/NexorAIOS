import { NextRequest, NextResponse } from 'next/server';
import { updateSocialContent, type SocialContentStatus } from '@/lib/social-content';

export const runtime = 'nodejs';

const STATUSES: SocialContentStatus[] = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const status = body.status === undefined ? undefined : String(body.status).toUpperCase() as SocialContentStatus;

    if (status && !STATUSES.includes(status)) throw new Error('Invalid content status');

    const post = await updateSocialContent(id, {
      status,
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      caption: typeof body.caption === 'string' ? body.caption.trim() : undefined,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.filter((value: unknown): value is string => typeof value === 'string').slice(0, 30)
        : undefined,
      mediaUrl: body.mediaUrl === null || typeof body.mediaUrl === 'string' ? body.mediaUrl : undefined,
      scheduledAt: body.scheduledAt === null || typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
      error: body.error === null || typeof body.error === 'string' ? body.error : undefined,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
