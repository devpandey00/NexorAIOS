import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform, writeAudit } from '@/lib/aios-platform';

export const runtime = 'nodejs';

const defaultChecklist = { company: false, goals: false, audience: false, services: false, competitors: false, branding: false, assets: false, social: false, adAccounts: false, website: false, access: false, reporting: false };

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  await ensureAiosPlatform();
  const db = getDatabaseClients().read;
  const rows = await db.$queryRawUnsafe(`SELECT w.*, o.checklist, o.completed_at AS "onboardingCompletedAt" FROM public.aios_client_workspaces w LEFT JOIN public.aios_client_onboarding o ON o.workspace_id=w.id WHERE w.owner_user_id=$1::uuid OR w.owner_user_id IS NULL ORDER BY w.created_at DESC LIMIT 100`, user.id);
  return NextResponse.json({ success: true, clients: rows });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const body = await request.json();
    const name = String(body.clientName || '').trim();
    if (!name) throw new Error('clientName is required');
    const db = getDatabaseClients().write;
    const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO public.aios_client_workspaces (client_name,client_email,company_name,owner_user_id,status,goals,services) VALUES ($1,$2,$3,$4::uuid,'ONBOARDING',$5,$6::jsonb) RETURNING id`, name, body.clientEmail ? String(body.clientEmail) : null, body.companyName ? String(body.companyName) : name, user.id, body.goals ? String(body.goals) : null, JSON.stringify(Array.isArray(body.services) ? body.services.map(String) : []));
    const id = rows[0]?.id;
    await db.$executeRawUnsafe(`INSERT INTO public.aios_client_onboarding (workspace_id,checklist) VALUES ($1::uuid,$2::jsonb)`, id, JSON.stringify(defaultChecklist));
    await writeAudit({ userId: user.id, action: 'CLIENT_WORKSPACE_CREATED', targetType: 'CLIENT', targetId: id });
    return NextResponse.json({ success: true, id, status: 'ONBOARDING', checklist: defaultChecklist }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const body = await request.json();
    const id = String(body.id || '');
    if (!id) throw new Error('id is required');
    const db = getDatabaseClients().write;
    if (body.checklist && typeof body.checklist === 'object') {
      await db.$executeRawUnsafe(`UPDATE public.aios_client_onboarding SET checklist=$1::jsonb, updated_at=now(), completed_at=CASE WHEN NOT EXISTS (SELECT 1 FROM jsonb_each_text($1::jsonb) WHERE value <> 'true') THEN now() ELSE completed_at END WHERE workspace_id=$2::uuid`, JSON.stringify(body.checklist), id);
    }
    if (body.status) await db.$executeRawUnsafe(`UPDATE public.aios_client_workspaces SET status=$1, updated_at=now() WHERE id=$2::uuid AND owner_user_id=$3::uuid`, String(body.status), id, user.id);
    return NextResponse.json({ success: true, id });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
