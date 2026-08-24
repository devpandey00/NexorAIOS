import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText } from '@/lib/whatsapp';

export const runtime = 'nodejs';

function authorized(request: NextRequest): boolean {
  const secret = process.env.OUTREACH_API_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('x-nexor-internal-secret') === secret;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body.to !== 'string' || typeof body.message !== 'string') {
      return NextResponse.json({ success: false, error: 'to and message are required' }, { status: 400 });
    }

    const result = await sendWhatsAppText(body.to, body.message);
    return NextResponse.json({ success: true, provider: result.provider, messageId: result.messageId, recipient: result.recipient });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
