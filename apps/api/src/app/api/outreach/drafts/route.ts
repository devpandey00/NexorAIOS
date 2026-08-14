import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';

const prisma = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const drafts = await prisma.outreach.findMany({
    where: { status: OutreachStatus.DRAFT },
    include: { lead: true, campaign: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, count: drafts.length, drafts });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action === 'approve' ? 'approve' : body.action === 'cancel' ? 'cancel' : '';

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    }

    const existing = await prisma.outreach.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (existing.status !== OutreachStatus.DRAFT) {
      return NextResponse.json({ success: false, error: `Only DRAFT outreach can be changed. Current status: ${existing.status}` }, { status: 409 });
    }

    const status = action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED;
    const draft = await prisma.outreach.update({
      where: { id },
      data: { status, approvedAt: action === 'approve' ? new Date() : null },
    });

    return NextResponse.json({ success: true, draft });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
