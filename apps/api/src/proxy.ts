import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from './lib/auth';

const PUBLIC_API = ['/api/auth/login', '/api/auth/logout', '/api/auth/me', '/api/health'];
const MACHINE_PREFIXES = ['/api/cron/', '/api/webhooks/'];

function isPublicApi(pathname: string) {
  return PUBLIC_API.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isMachineRoute(pathname: string) {
  return MACHINE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith('/dashboard');
  const isApi = pathname.startsWith('/api/');

  if (!isDashboard && !isApi) return NextResponse.next();
  if (isApi && (isPublicApi(pathname) || isMachineRoute(pathname))) return NextResponse.next();

  const token = request.cookies.get('nexor_session')?.value;
  const user = verifySessionToken(token);

  if (!user) {
    if (isApi) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  const headers = new Headers(request.headers);
  headers.delete('x-nexor-user-id');
  headers.delete('x-nexor-user-role');
  headers.set('x-nexor-user-id', user.id);
  headers.set('x-nexor-user-role', user.role);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
