import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, message } = await request.json();
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US';

    if (!token || !phoneNumberId || !templateName) {
      return NextResponse.json({
        sent: false,
        error: 'WhatsApp Cloud API is not configured. Add WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TEMPLATE_NAME in Vercel environment variables.',
      }, { status: 503 });
    }

    const digits = String(phone ?? '').replace(/\D/g, '');
    if (!digits || !message) return NextResponse.json({ sent: false, error: 'Phone and message are required.' }, { status: 400 });

    // Business-initiated WhatsApp outreach should use an approved template.
    // The template should accept one body variable containing the personalised message.
    const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'template',
        template: { name: templateName, language: { code: language }, components: [{ type: 'body', parameters: [{ type: 'text', text: message.slice(0, 1024) }] }] },
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ sent: false, error: data?.error?.message ?? 'WhatsApp provider rejected the message.' }, { status: response.status });
    return NextResponse.json({ sent: true, providerMessageId: data?.messages?.[0]?.id ?? null });
  } catch (error) {
    return NextResponse.json({ sent: false, error: error instanceof Error ? error.message : 'WhatsApp send failed' }, { status: 500 });
  }
}
