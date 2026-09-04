import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters');
  return value;
}

export function createClientPortalToken(workspaceId: string, expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30) {
  const payload = `${workspaceId}.${expiresAt}`;
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifyClientPortalToken(token: string | undefined, workspaceId: string) {
  if (!token) return false;
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return false;
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const [id, expiry] = payload.split('.');
    if (id !== workspaceId || !expiry || Number(expiry) < Date.now()) return false;
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
    const a = Buffer.from(signature); const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch { return false; }
}
