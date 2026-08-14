import { NextResponse } from 'next/server';
import { FollowUpStatus, getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';

const prisma = getDatabaseClients().write;

export async function GET() {
  const followUps = await prisma.followUp.findMany({
    where: { status: FollowUpStatus.PENDING, scheduledAt: { lte: new Date() } },
    include: { lead: true },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });

  return NextResponse.json({ success: true, count: followUps.length, followUps });
}

export async function POST() {
  try {
    const due = await prisma.followUp.findMany({
      where: { status: FollowUpStatus.PENDING, scheduledAt: { lte: new Date() } },
      include: { lead: true },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    });

    let created = 0;

    for (const followUp of due) {
      if (followUp.attemptCount >= followUp.maxAttempts) {
        await prisma.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.CANCELLED } });
        continue;
      }

      const channel = followUp.lead.whatsapp ? OutreachChannel.WHATSAPP : followUp.lead.email ? OutreachChannel.EMAIL : null;
      if (!channel) {
        await prisma.followUp.update({ where: { id: followUp.id }, data: { status: FollowUpStatus.CANCELLED, notes: 'No supported contact channel' } });
        continue;
      }

      const exists = await prisma.outreach.findFirst({
        where: {
          leadId: followUp.leadId,
          status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (exists) continue;

      const name = followUp.lead.businessName;
      const message = `Hi ${name}, just following up on my earlier message. I had a few specific ideas around improving your online lead generation. If it’s relevant, I can send the details over.`;

      await prisma.outreach.create({
        data: {
          leadId: followUp.leadId,
          channel,
          status: OutreachStatus.DRAFT,
          message,
        },
      });

      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: FollowUpStatus.COMPLETED, attemptCount: { increment: 1 } },
      });

      created++;
    }

    return NextResponse.json({ success: true, due: due.length, draftsCreated: created });
  } catch (error) {
    console.error('[FOLLOWUP PROCESS ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
