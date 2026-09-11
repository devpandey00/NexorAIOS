import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getOpenWAConnectionStatus, getOpenWAStatus, startOpenWASession } from '@/lib/openwa';

export const runtime = 'nodejs';

async function authorized(req: NextRequest) {
  const user = await getSessionUser(req);
  return Boolean(user);
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const config = getOpenWAStatus();
    if (!config.configured) return NextResponse.json({ success: true, provider: config, connected: false, status: 'not_configured' });
    const connection = await getOpenWAConnectionStatus();
    return NextResponse.json({ success: true, provider: config, connection, connected: connection.ready });
  } catch (error) {
    return NextResponse.json({ success: false, provider: getOpenWAStatus(), connected: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action !== 'start') return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
    const connection = await startOpenWASession();
    return NextResponse.json({ success: true, connection });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
