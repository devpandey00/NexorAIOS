import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';

const prisma = getDatabaseClients().write;

export async function GET() {
  const drafts = await prisma.outreach.findMany({
    where: { status: OutreachStatus.DRAFT },
    include: { lead: true, campaign: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, count: drafts.length, drafts });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action === 'approve' ? 'approve' : body.action === 'cancel' ? 'cancel' : '';

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    }

    const status = action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED;
    const draft = await prisma.outreach.update({ where: { id }, data: { status, approvedAt: action === 'approve' ? new Date() : null } });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
