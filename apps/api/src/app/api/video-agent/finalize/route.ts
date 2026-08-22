import { NextResponse } from 'next/server';
import { finalizeAndBuild } from '@/lib/video-agent/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const projectId = String(body.projectId || '').trim();
    const receipt = String(body.receipt || '').trim();
    const durationInSeconds = Number(body.durationInSeconds);
    const count = Math.max(1, Math.min(12, Math.round(Number(body.count) || 6)));
    if (!projectId || !receipt || !Number.isFinite(durationInSeconds) || durationInSeconds <= 0) {
      return NextResponse.json({ ok: false, error: 'projectId, receipt and durationInSeconds are required' }, { status: 400 });
    }
    const result = await finalizeAndBuild({
      projectId, receipt, durationInSeconds,
      width: Number.isFinite(Number(body.width)) ? Number(body.width) : undefined,
      height: Number.isFinite(Number(body.height)) ? Number(body.height) : undefined,
      fps: Number.isFinite(Number(body.fps)) && Number(body.fps) > 0 ? Number(body.fps) : 30,
      hasAudioTrack: body.hasAudioTrack !== false,
      count,
      instruction: typeof body.instruction === 'string' ? body.instruction.slice(0, 2000) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
