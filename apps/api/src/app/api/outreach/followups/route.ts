import { NextRequest, NextResponse } from 'next/server';
import { FollowUpStatus, getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

function getPrisma() { return getDatabaseClients().write; }

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const followUps = await prisma.followUp.findMany({ where: { status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] } }, include: { lead: true }, orderBy: { scheduledAt: 'asc' }, take: 200 });
    return NextResponse.json({ success: true, count: followUps.length, followUps });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const due = await prisma.followUp.findMany({ where: { status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] }, scheduledAt: { lte: new Date() } }, include: { lead: true }, orderBy: { scheduledAt: 'asc' }, take: 100 });
    let created = 0;
    for (const followUp of due) {
      if (followUp.attemptCount >= followUp.maxAttempts) { await prisma.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.CANCELLED } }); continue; }
      const channel = followUp.lead.whatsapp ? OutreachChannel.WHATSAPP : followUp.lead.email ? OutreachChannel.EMAIL : null;
      if (!channel) { await prisma.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.CANCELLED, notes: 'No supported contact channel' } }); continue; }
      const exists = await prisma.outreach.findFirst({ where: { leadId: followUp.leadId, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
      if (exists) continue;
      const name = followUp.lead.ownerName || followUp.lead.businessName;
      const message = channel === OutreachChannel.EMAIL
        ? `Subject: Following up — ${followUp.lead.businessName}\n\nHi ${name},\n\nJust following up on my earlier message. I had a few specific ideas around improving your online lead generation and would be happy to send them over.\n\nRegards,\nNexor Media`
        : `Hi ${name}, just following up on my earlier message. I had a few specific ideas around improving ${followUp.lead.businessName}'s online lead generation. I can send them over if useful. — Nexor Media`;
      await prisma.$transaction(async (tx) => {
        await tx.outreach.create({ data: { leadId: followUp.leadId, channel, status: OutreachStatus.DRAFT, message } });
        await tx.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.COMPLETED, attemptCount: { increment: 1 } } });
      });
      created++;
    }
    return NextResponse.json({ success: true, due: due.length, draftsCreated: created });
  } catch (error) { console.error('[FOLLOWUP PROCESS ERROR]', error); return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = typeof body.action === 'string' ? body.action : '';
    if (!id || !['complete', 'cancel', 'reschedule'].includes(action)) return NextResponse.json({ success: false, error: 'id and action (complete, cancel, reschedule) are required' }, { status: 400 });
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 });
    if (action === 'reschedule') {
      const scheduledAt = typeof body.scheduledAt === 'string' ? new Date(body.scheduledAt) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ success: false, error: 'A valid scheduledAt is required' }, { status: 400 });
      const followUp = await prisma.followUp.update({ where: { id }, data: { scheduledAt, status: FollowUpStatus.SCHEDULED } });
      return NextResponse.json({ success: true, followUp });
    }
    const followUp = await prisma.followUp.update({ where: { id }, data: { status: action === 'complete' ? FollowUpStatus.COMPLETED : FollowUpStatus.CANCELLED } });
    return NextResponse.json({ success: true, followUp });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
