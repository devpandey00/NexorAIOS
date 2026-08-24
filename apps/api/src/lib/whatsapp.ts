import crypto from 'node:crypto';

const graphVersion = process.env.WHATSAPP_API_VERSION || 'v23.0';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`WhatsApp configuration required: ${name}`);
  return value;
}

export type WhatsAppSendResult = {
  provider: 'whatsapp-cloud-api';
  messageId: string;
  phoneNumberId: string;
  recipient: string;
  raw: unknown;
};

export async function sendWhatsAppText(to: string, body: string): Promise<WhatsAppSendResult> {
  if (!/^\+?[1-9]\d{7,14}$/.test(to.replace(/[\s()-]/g, ''))) {
    throw new Error('Invalid WhatsApp recipient phone number');
  }
  if (!body.trim() || body.length > 4096) throw new Error('WhatsApp text body must contain 1-4096 characters');

  const token = required('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = required('WHATSAPP_PHONE_NUMBER_ID');
  const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[\s()-]/g, ''),
      type: 'text',
      text: { preview_url: false, body: body.trim() },
    }),
    cache: 'no-store',
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof raw === 'object' && raw && 'error' in raw
      ? JSON.stringify((raw as { error: unknown }).error)
      : `WhatsApp API returned HTTP ${response.status}`;
    throw new Error(message);
  }

  const messageId = typeof raw === 'object' && raw && Array.isArray((raw as { messages?: unknown }).messages)
    ? String(((raw as { messages: Array<{ id?: string }> }).messages[0]?.id) || '')
    : '';
  if (!messageId) throw new Error('WhatsApp API returned no message ID');

  return { provider: 'whatsapp-cloud-api', messageId, phoneNumberId, recipient: to, raw };
}

export function verifyWhatsAppWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const actual = signatureHeader.slice('sha256='.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function verifyWhatsAppWebhookToken(token: string): boolean {
  return Boolean(process.env.WHATSAPP_VERIFY_TOKEN) && token === process.env.WHATSAPP_VERIFY_TOKEN;
}
