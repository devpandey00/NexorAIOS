import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';

function getPrisma() { return getDatabaseClients().write; }

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const scheduledAt = typeof body?.scheduledAt === 'string' ? new Date(body.scheduledAt) : new Date();
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    if (Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ success: false, error: 'scheduledAt must be a valid ISO timestamp' }, { status: 400 });
    const outreach = await prisma.outreach.findUnique({ where: { id } });
    if (!outreach) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (outreach.status !== OutreachStatus.APPROVED) return NextResponse.json({ success: false, error: 'Outreach must be approved before scheduling' }, { status: 409 });
    const updated = await prisma.outreach.update({ where: { id }, data: { status: OutreachStatus.SCHEDULED, scheduledAt, error: null } });
    return NextResponse.json({ success: true, outreach: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
