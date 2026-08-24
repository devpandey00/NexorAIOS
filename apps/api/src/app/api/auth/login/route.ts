import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { bootstrapAdminIfEmpty, createSessionToken, verifyPassword, type SessionUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  try {
    await bootstrapAdminIfEmpty();
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    const db = getDatabaseClients().read;
    const rows = await db.$queryRawUnsafe<Array<{ id: string; email: string; password_hash: string; role: 'ADMIN' | 'USER' }>>(
      'SELECT id, email, password_hash, role FROM public.users WHERE email = $1 LIMIT 1',
      email,
    );
    const user = rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionUser: SessionUser = { id: user.id, email: user.email, role: user.role };
    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({ success: true, user: sessionUser }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });

    // Always use a secure, HttpOnly cookie in production. SameSite=Lax allows
    // normal top-level navigation while keeping the session inaccessible to JS.
    response.cookies.set({
      name: 'nexor_session',
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
