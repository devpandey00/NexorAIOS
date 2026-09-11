import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await getSessionUser(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ success: false, error: 'Outreach id is required' }, { status: 400 });

    const prisma = getDatabaseClients().write;
    const item = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
    if (!item) return NextResponse.json({ success: false, error: 'WhatsApp outreach not found' }, { status: 404 });
    if (item.channel !== OutreachChannel.WHATSAPP) return NextResponse.json({ success: false, error: 'This action is only available for WhatsApp outreach' }, { status: 400 });
    const approvalPending = item.status === OutreachStatus.APPROVAL_REQUIRED || item.status === OutreachStatus.DRAFT;
    if (!approvalPending && item.status !== OutreachStatus.APPROVED) {
      return NextResponse.json({ success: false, error: `This message is ${item.status.toLowerCase()} and cannot be sent from the control room.` }, { status: 409 });
    }

    if (approvalPending) {
      const claimed = await prisma.outreach.updateMany({
        where: { id, status: { in: [OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.DRAFT] } },
        data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt: new Date(), error: null },
      });
      if (claimed.count !== 1) return NextResponse.json({ success: false, error: 'Message state changed; refresh the queue.' }, { status: 409 });
    }

    const result = await sendApprovedOutreach(id);
    return NextResponse.json({ success: true, sent: !result.alreadySent, result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
