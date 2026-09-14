import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

function safeEqual(a: string, b: string) {
  const ah = createHash('sha256').update(a).digest();
  const bh = createHash('sha256').update(b).digest();
  return timingSafeEqual(ah, bh);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return NextResponse.json({ ok: false, error: 'Admin credentials are not configured on this deployment.' }, { status: 503 });
    }

    if (!safeEqual(email, adminEmail) || !safeEqual(password, adminPassword)) {
      return NextResponse.json({ ok: false, error: 'Invalid admin credentials.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('nexor_portfolio_admin', createHash('sha256').update(`${adminEmail}:${adminPassword}`).digest('hex'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });
  }
}
