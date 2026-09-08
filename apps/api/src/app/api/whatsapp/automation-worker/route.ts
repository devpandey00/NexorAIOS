import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { createSessionToken, sessionCookie } from '@/lib/auth';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function getInternalAdminCookie() {
  const db = getDatabaseClients().read;
  const rows = await db.$queryRawUnsafe<Array<{ id: string; email: string; role: 'ADMIN' | 'USER' }>>(
    "SELECT id, email, role FROM public.users WHERE role = 'ADMIN'::public.user_role ORDER BY created_at ASC LIMIT 1",
  );
  const admin = rows[0];
  if (!admin) throw new Error('No admin user is available for the machine worker');
  return sessionCookie(createSessionToken(admin));
}

export async function POST(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.text();
    const cookie = await getInternalAdminCookie();
    const target = new URL('/api/whatsapp/automation', req.url);
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookie.split(';')[0] },
      body,
      cache: 'no-store',
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
