import { NextResponse } from 'next/server';
import { createVideoSession } from '@/lib/video-agent/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.OPENCHATCUT_MCP_TOKEN),
    endpoint: process.env.OPENCHATCUT_MCP_URL?.trim() || 'http://127.0.0.1:5199/api/external-mcp/mcp',
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { filename?: string; contentType?: string; size?: number };
    const filename = String(body.filename || '').trim();
    const contentType = String(body.contentType || 'video/mp4').trim();
    const size = Number(body.size);
    if (!filename || !Number.isSafeInteger(size) || size <= 0) {
      return NextResponse.json({ ok: false, error: 'filename and a positive integer size are required' }, { status: 400 });
    }
    if (size > 2 * 1024 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'Video exceeds the 2 GB Nexor safety limit' }, { status: 413 });
    }
    return NextResponse.json(await createVideoSession({ filename, contentType, size }));
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
