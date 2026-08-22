import { NextResponse } from 'next/server';
import { FollowUpStatus, getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';

function getPrisma() { return getDatabaseClients().write; }

function buildFollowUpMessage(lead: { businessName: string; notes: string | null }) {
  let requirement = 'improving your online lead generation';
  let finding = '';
  if (lead.notes) {
    try {
      const parsed = JSON.parse(lead.notes) as { intelligence?: { requirement?: unknown; findings?: unknown } };
      if (typeof parsed.intelligence?.requirement === 'string' && parsed.intelligence.requirement.trim()) requirement = parsed.intelligence.requirement.trim();
      if (Array.isArray(parsed.intelligence?.findings)) {
        const first = parsed.intelligence.findings.find((item) => typeof item === 'string' && item.trim());
        if (typeof first === 'string') finding = first.trim();
      }
    } catch {
      // Historical malformed notes do not block a safe fallback follow-up.
    }
  }
  return [
    `Hi ${lead.businessName}, just following up on my earlier note.`,
    `I was looking specifically at ${requirement}.`,
    finding ? `One thing that stood out was ${finding}.` : 'I had a couple of specific observations from the review.',
    'Happy to send the details over if useful.',
  ].join(' ');
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const prisma = getPrisma();
    const due = await prisma.followUp.findMany({ where: { status: FollowUpStatus.PENDING, scheduledAt: { lte: new Date() } }, include: { lead: true }, orderBy: { scheduledAt: 'asc' }, take: 100 });
    let queued = 0;
    let skipped = 0;

    for (const candidate of due) {
      const claimed = await prisma.followUp.updateMany({
        where: { id: candidate.id, status: FollowUpStatus.PENDING },
        data: { status: FollowUpStatus.SCHEDULED, notes: `${candidate.notes ?? ''}\nClaimed by follow-up worker at ${new Date().toISOString()}`.trim() },
      });
      if (claimed.count !== 1) continue;

      try {
        if (candidate.attemptCount >= candidate.maxAttempts) {
          await prisma.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.CANCELLED } });
          continue;
        }

        const terminal = await prisma.conversation.findFirst({ where: { leadId: candidate.leadId, status: { in: ['NOT_INTERESTED', 'WRONG_PERSON'] } }, select: { id: true } });
        if (terminal) {
          await prisma.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.CANCELLED, notes: 'Cancelled because reply intelligence marked the lead as not contactable for follow-up.' } });
          skipped++;
          continue;
        }

        const channel = candidate.lead.whatsapp ? OutreachChannel.WHATSAPP : candidate.lead.email ? OutreachChannel.EMAIL : null;
        if (!channel) {
          await prisma.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.CANCELLED, notes: 'No supported contact channel' } });
          skipped++;
          continue;
        }

        const existing = await prisma.outreach.findFirst({ where: { leadId: candidate.leadId, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
        if (existing) {
          await prisma.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.COMPLETED, attemptCount: { increment: 1 }, notes: `${candidate.notes ?? ''}\nSkipped because active outreach already exists.`.trim() } });
          skipped++;
          continue;
        }

        const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
        await prisma.$transaction(async (tx) => {
          await tx.outreach.create({ data: { leadId: candidate.leadId, channel, status: OutreachStatus.APPROVED, message: buildFollowUpMessage(candidate.lead), approvedAt: new Date(), scheduledAt } });
          await tx.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.COMPLETED, attemptCount: { increment: 1 }, notes: `${candidate.notes ?? ''}\nAutomatic follow-up queued for ${scheduledAt.toISOString()}`.trim() } });
        });
        queued++;
      } catch (error) {
        await prisma.followUp.update({ where: { id: candidate.id }, data: { status: FollowUpStatus.PENDING, attemptCount: { increment: 1 }, notes: `${candidate.notes ?? ''}\nWorker error: ${error instanceof Error ? error.message : String(error)}`.trim() } }).catch(() => undefined);
      }
    }

    return NextResponse.json({ success: true, due: due.length, queued, skipped });
  } catch (error) {
    console.error('[CRON FOLLOWUP ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
