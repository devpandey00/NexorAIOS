import { createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.WHATSAPP_APPROVAL_SECRET?.trim() || process.env.CRON_SECRET?.trim() || process.env.SESSION_SECRET?.trim();
  if (!value) throw new Error('WhatsApp approval secret is not configured');
  return value;
}

function base64url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createWhatsAppApprovalToken(ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean).slice(0, 20);
  if (!uniqueIds.length) throw new Error('No outreach items to approve');
  const payload = JSON.stringify({ ids: uniqueIds, exp: Date.now() + TOKEN_TTL_MS });
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyWhatsAppApprovalToken(token: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) throw new Error('Invalid approval link');
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid approval signature');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { ids?: unknown; exp?: unknown };
  const ids = Array.isArray(payload.ids) ? payload.ids.filter((id): id is string => typeof id === 'string') : [];
  if (!ids.length || typeof payload.exp !== 'number' || payload.exp < Date.now()) throw new Error('Approval link expired');
  return { ids: [...new Set(ids)].slice(0, 20), expiresAt: new Date(payload.exp) };
}

export function getApprovalBaseUrl(requestUrl?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (requestUrl) return new URL(requestUrl).origin;
  throw new Error('NEXT_PUBLIC_APP_URL or APP_URL is required for WhatsApp approval links');
}
