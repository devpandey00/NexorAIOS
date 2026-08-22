import { NextResponse } from 'next/server';
import { renderStatus } from '@/lib/video-agent/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { projectId?: string; renderId?: string };
    const projectId = String(body.projectId || '').trim();
    const renderId = String(body.renderId || '').trim();
    if (!projectId || !renderId) return NextResponse.json({ ok: false, error: 'projectId and renderId are required' }, { status: 400 });
    return NextResponse.json(await renderStatus({ projectId, renderId }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
