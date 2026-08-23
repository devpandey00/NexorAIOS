import { NextRequest, NextResponse } from 'next/server';
import { updateSocialContent, listSocialContent, type SocialContentStatus } from '@/lib/social-content';

export const runtime = 'nodejs';

const TRANSITIONS: Record<SocialContentStatus, SocialContentStatus[]> = {
  DRAFT: ['REVIEW'],
  REVIEW: ['DRAFT', 'APPROVED'],
  APPROVED: ['REVIEW', 'SCHEDULED'],
  SCHEDULED: ['APPROVED'],
  PUBLISHED: [],
  FAILED: ['APPROVED', 'DRAFT'],
};

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const requestedStatus = body.status === undefined ? undefined : String(body.status).toUpperCase() as SocialContentStatus;

    const current = (await listSocialContent({ limit: 200 })).find((item) => item.id === id);
    if (!current) return NextResponse.json({ success: false, error: 'Content post not found' }, { status: 404 });

    if (requestedStatus) {
      if (!Object.prototype.hasOwnProperty.call(TRANSITIONS, requestedStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid content status' }, { status: 400 });
      }
      if (requestedStatus === 'PUBLISHED') {
        return NextResponse.json({ success: false, error: 'PUBLISHED is provider-controlled; use the publish workflow' }, { status: 409 });
      }
      if (requestedStatus !== current.status && !TRANSITIONS[current.status].includes(requestedStatus)) {
        return NextResponse.json({ success: false, error: `Invalid status transition: ${current.status} -> ${requestedStatus}` }, { status: 409 });
      }
    }

    const post = await updateSocialContent(id, {
      status: requestedStatus,
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      caption: typeof body.caption === 'string' ? body.caption.trim() : undefined,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.filter((value: unknown): value is string => typeof value === 'string').slice(0, 30)
        : undefined,
      mediaUrl: body.mediaUrl === null || typeof body.mediaUrl === 'string' ? body.mediaUrl : undefined,
      scheduledAt: body.scheduledAt === null || typeof body.scheduledAt === 'string' ? body.scheduledAt : undefined,
      error: typeof body.error === 'string' ? body.error : undefined,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
