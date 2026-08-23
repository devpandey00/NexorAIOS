import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabaseClients } from '@nexor/database';

const scrypt = promisify(scryptCallback);
const COOKIE = 'nexor_session';
const TTL_SECONDS = 60 * 60 * 24 * 7;

type Role = 'ADMIN' | 'USER';
export type SessionUser = { id: string; email: string; role: Role };

type DbUser = { id: string; email: string; password_hash: string; role: Role };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be set to at least 32 characters');
  return value;
}

function b64(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function sign(payload: string) {
  return b64(createHmac('sha256', secret()).update(payload).digest());
}

export function createSessionToken(user: SessionUser) {
  const payload = `${user.id}.${user.email}.${user.role}.${Math.floor(Date.now() / 1000) + TTL_SECONDS}`;
  return `${b64(payload)}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const expected = sign(payload);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const [id, email, role, exp] = payload.split('.');
    if (!id || !email || (role !== 'ADMIN' && role !== 'USER') || !exp || Number(exp) < Math.floor(Date.now() / 1000)) return null;
    return { id, email, role };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function getSessionCookie(request: Request) {
  const raw = request.headers.get('cookie') ?? '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1];
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const session = verifySessionToken(getSessionCookie(request));
  if (!session) return null;
  try {
    const db = getDatabaseClients().read;
    const rows = await db.$queryRawUnsafe<DbUser[]>(
      'SELECT id, email, password_hash, role FROM public.users WHERE id = $1::uuid LIMIT 1',
      session.id,
    );
    const user = rows[0];
    return user && user.email === session.email && user.role === session.role
      ? { id: user.id, email: user.email, role: user.role }
      : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  if (password.length < 12) throw new Error('Password must be at least 12 characters');
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${b64(salt)}$${b64(derived)}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt64, hash64] = encoded.split('$');
  if (scheme !== 'scrypt' || !salt64 || !hash64) return false;
  try {
    const salt = Buffer.from(salt64, 'base64url');
    const expected = Buffer.from(hash64, 'base64url');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function bootstrapAdminIfEmpty() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const db = getDatabaseClients().write;
  const rows = await db.$queryRawUnsafe<Array<{ count: bigint }>>('SELECT COUNT(*)::bigint AS count FROM public.users');
  if (Number(rows[0]?.count ?? 0) > 0) return;
  const passwordHash = await hashPassword(password);
  await db.$executeRawUnsafe(
    'INSERT INTO public.users (email, password_hash, role) VALUES ($1, $2, \'ADMIN\'::public.user_role) ON CONFLICT (email) DO NOTHING',
    email,
    passwordHash,
  );
}

export const AUTH_COOKIE_NAME = COOKIE;
