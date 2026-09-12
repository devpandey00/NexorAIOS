import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getSocialContent, updateSocialContent } from '@/lib/social-content';
import { publishSocialPost } from '@/lib/social-publisher';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!(await getSessionUser(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const { id } = await context.params;
    const post = await getSocialContent(id);
    if (!post) return NextResponse.json({ success: false, error: 'Content post not found' }, { status: 404 });
    if (!['APPROVED', 'SCHEDULED', 'PUBLISHING'].includes(post.status)) {
      return NextResponse.json({ success: false, error: `Post must be approved before publishing; current status is ${post.status}` }, { status: 409 });
    }

    await updateSocialContent(id, { status: 'PUBLISHING', error: null });
    try {
      const published = await publishSocialPost(id);
      return NextResponse.json({ success: true, post: published });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSocialContent(id, { status: 'FAILED', error: message }).catch(() => undefined);
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
