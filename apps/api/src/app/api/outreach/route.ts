import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';
const prisma = getDatabaseClients().write;
const PENDING_APPROVAL_STATUSES: OutreachStatus[] = [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED];
export async function GET() {
  try {
    const drafts = await prisma.outreach.findMany({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED] } }, include: { lead: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ success: true, count: drafts.length, drafts });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); const id = typeof body.id === 'string' ? body.id : ''; const action = typeof body.action === 'string' ? body.action : '';
    if (!id || !['approve','reject'].includes(action)) return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    const current = await prisma.outreach.findUnique({ where: { id } }); if (!current) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (!PENDING_APPROVAL_STATUSES.includes(current.status)) return NextResponse.json({ success: false, error: 'Outreach is not pending approval' }, { status: 409 });
    const outreach = await prisma.outreach.update({ where: { id }, data: { status: action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED, approvedAt: action === 'approve' ? new Date() : null } });
    return NextResponse.json({ success: true, outreach });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
