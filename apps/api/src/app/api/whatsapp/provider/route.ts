import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getOpenWAConnectionStatus, getOpenWAStatus, startOpenWASession } from '@/lib/openwa';

export const runtime = 'nodejs';

function metaFallbackStatus() {
  const token = Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim());
  const phoneNumberId = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());
  const templateName = Boolean(process.env.WHATSAPP_TEMPLATE_NAME?.trim());
  return {
    configured: token && phoneNumberId,
    templateConfigured: token && phoneNumberId && templateName,
  };
}

async function authorized(req: NextRequest) {
  const user = await getSessionUser(req);
  return Boolean(user);
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const config = getOpenWAStatus();
  const fallback = metaFallbackStatus();
  if (!config.configured) {
    return NextResponse.json({
      success: true,
      provider: config,
      connected: false,
      status: fallback.templateConfigured ? 'fallback_ready' : 'not_configured',
      fallback,
    });
  }
  try {
    const connection = await getOpenWAConnectionStatus();
    return NextResponse.json({
      success: true,
      provider: config,
      connection,
      connected: connection.ready,
      status: connection.ready ? 'connected' : 'not_ready',
      fallback,
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      provider: config,
      connected: false,
      status: fallback.templateConfigured ? 'fallback_ready' : 'provider_error',
      fallback,
      error: error instanceof Error ? error.message : String(error),
    });
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
