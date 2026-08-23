import { NextResponse } from 'next/server';
import { createSocialContent, type SocialContentPlatform } from '@/lib/social-content';
import { renderStatus } from '@/lib/video-agent/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PLATFORMS: SocialContentPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      projectId?: string;
      renderId?: string;
      platform?: string;
      title?: string;
      caption?: string;
      hashtags?: unknown;
    };
    const projectId = String(body.projectId || '').trim();
    const renderId = String(body.renderId || '').trim();
    const platform = String(body.platform || 'INSTAGRAM').toUpperCase() as SocialContentPlatform;
    if (!projectId || !renderId) return NextResponse.json({ ok: false, error: 'projectId and renderId are required' }, { status: 400 });
    if (!PLATFORMS.includes(platform)) return NextResponse.json({ ok: false, error: 'Invalid social platform' }, { status: 400 });

    const render = await renderStatus({ projectId, renderId });
    const record = render as Record<string, unknown>;
    const status = String(record.status ?? record.state ?? record.renderStatus ?? '').toUpperCase();
    const mediaUrl = [record.outputUrl, record.url, record.downloadUrl].find((value): value is string => typeof value === 'string' && /^https?:\/\//.test(value));
    if (!mediaUrl) return NextResponse.json({ ok: false, error: status === 'FAILED' ? 'Render failed; no social asset was created' : 'Render is not complete or did not return a public output URL', render }, { status: 409 });
    if (status && !['COMPLETED', 'COMPLETE', 'READY', 'SUCCESS', 'SUCCEEDED'].includes(status)) {
      return NextResponse.json({ ok: false, error: `Render is not complete: ${status}`, render }, { status: 409 });
    }

    const hashtags = Array.isArray(body.hashtags)
      ? body.hashtags.filter((value): value is string => typeof value === 'string').slice(0, 30)
      : [];
    const post = await createSocialContent({
      platform,
      status: 'DRAFT',
      title: String(body.title || 'Nexor Video').trim(),
      caption: String(body.caption || '').trim(),
      hashtags,
      mediaUrl,
    });
    return NextResponse.json({ ok: true, post, render });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
