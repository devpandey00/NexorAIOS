import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform } from '@/lib/aios-platform';
import { createClientPortalToken } from '@/lib/client-portal';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const body = await request.json();
    const id = String(body.workspaceId || '');
    if (!id) throw new Error('workspaceId is required');
    const db = getDatabaseClients().read;
    const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM public.aios_client_workspaces WHERE id=$1::uuid AND owner_user_id=$2::uuid`, id, user.id);
    if (!rows[0]) return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 });
    const token = createClientPortalToken(id);
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
    return NextResponse.json({ success: true, workspaceId: id, token, portalPath: `/client-portal?workspace=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`, portalUrl: base ? `${base.replace(/\/$/, '')}/client-portal?workspace=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}` : null, expiresInDays: 30 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
