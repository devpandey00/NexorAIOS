import { NextResponse } from 'next/server';
import { submitRender } from '@/lib/video-agent/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { projectId?: string; timelineId?: string; name?: string };
    const projectId = String(body.projectId || '').trim();
    const timelineId = String(body.timelineId || '').trim();
    if (!projectId || !timelineId) return NextResponse.json({ ok: false, error: 'projectId and timelineId are required' }, { status: 400 });
    return NextResponse.json(await submitRender({ projectId, timelineId, name: body.name }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
