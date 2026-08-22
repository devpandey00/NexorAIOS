import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

function allowedOrigin(): string {
  const configured = process.env.OPENCHATCUT_MCP_URL?.trim() || 'http://127.0.0.1:5199/api/external-mcp/mcp';
  return new URL(configured).origin;
}

export async function POST(request: Request) {
  const target = request.headers.get('x-nexor-upload-url')?.trim();
  if (!target) return NextResponse.json({ ok: false, error: 'x-nexor-upload-url is required' }, { status: 400 });
  let targetUrl: URL;
  try { targetUrl = new URL(target); } catch { return NextResponse.json({ ok: false, error: 'Invalid OpenChatCut upload URL' }, { status: 400 }); }
  if (targetUrl.origin !== allowedOrigin() || targetUrl.pathname !== '/upload') {
    return NextResponse.json({ ok: false, error: 'Upload URL is not an OpenChatCut upload endpoint' }, { status: 403 });
  }
  if (!request.body) return NextResponse.json({ ok: false, error: 'Request body is empty' }, { status: 400 });

  try {
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    if (contentType) headers.set('content-type', contentType);
    if (contentLength) headers.set('content-length', contentLength);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: request.body,
      cache: 'no-store',
      // Node's fetch requires duplex for a streaming request body.
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    const text = await response.text();
    return new NextResponse(text, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
