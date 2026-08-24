import { NextRequest, NextResponse } from 'next/server';
import { verifyWhatsAppWebhookSignature, verifyWhatsAppWebhookToken } from '@/lib/whatsapp';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token') || '';
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && challenge && verifyWhatsAppWebhookToken(token)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ success: false, error: 'Webhook verification failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWhatsAppWebhookSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    // Acknowledge only after signature validation. Business-event persistence can be
    // added behind this boundary without ever accepting forged provider callbacks.
    console.info('[whatsapp:webhook]', JSON.stringify({ object: payload.object, entryCount: Array.isArray(payload.entry) ? payload.entry.length : 0 }));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
  }
}
