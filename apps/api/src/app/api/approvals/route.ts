import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createApproval, listApprovals, setApproval } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const status = new URL(request.url).searchParams.get('status') ?? 'PENDING';
  try { return NextResponse.json({ success: true, approvals: await listApprovals(status) }); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!body.action || !body.targetType) return NextResponse.json({ success: false, error: 'action and targetType are required' }, { status: 400 });
    const id = await createApproval({ action: String(body.action), targetType: String(body.targetType), targetId: body.targetId ? String(body.targetId) : null, payload: body.payload ?? {}, reason: body.reason ? String(body.reason) : null, userId: user.id });
    return NextResponse.json({ success: true, id, status: 'PENDING' }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const status = String(body.status || '').toUpperCase();
    if (!body.id || !['APPROVED','REJECTED'].includes(status)) return NextResponse.json({ success: false, error: 'id and status APPROVED/REJECTED are required' }, { status: 400 });
    await setApproval(String(body.id), status as 'APPROVED' | 'REJECTED', user.id);
    return NextResponse.json({ success: true, id: body.id, status });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
