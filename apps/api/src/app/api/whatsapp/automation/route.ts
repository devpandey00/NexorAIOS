import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus, FollowUpStatus, TaskStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';

const prisma = getDatabaseClients().write;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET() {
  try {
    const [drafts, scheduled, sent, failed, replies, tasks] = await Promise.all([
      prisma.outreach.findMany({ where: { channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } }, include: { lead: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.outreach.findMany({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.SCHEDULED }, include: { lead: true }, orderBy: { scheduledAt: 'asc' }, take: 100 }),
      prisma.outreach.count({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.SENT } }),
      prisma.outreach.count({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.FAILED } }),
      prisma.conversation.findMany({ where: { channel: 'WHATSAPP', status: { in: ['INTERESTED', 'MEETING_REQUEST', 'NEEDS_REPLY', 'REPLIED'] } }, include: { lead: true, messages: { orderBy: { createdAt: 'desc' }, take: 3 } }, orderBy: { lastMessageAt: 'desc' }, take: 50 }),
      prisma.task.findMany({ where: { status: TaskStatus.TODO, leadId: { not: null } }, include: { lead: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 50 }),
    ]);

    return NextResponse.json({ success: true, stats: { drafts: drafts.length, scheduled: scheduled.length, sent, failed, replies: replies.length }, drafts, scheduled, replies, tasks });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = typeof body?.action === 'string' ? body.action : '';

    if (action === 'generate') {
      const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 25);
      const ids = Array.isArray(body.leadIds) ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string') : [];
      const leads = await prisma.lead.findMany({
        where: { whatsapp: { not: null }, ...(ids.length ? { id: { in: ids } } : {}), status: { in: ['NEW', 'RESEARCHED', 'QUALIFIED', 'PITCH_READY'] } },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      let created = 0;
      const errors: string[] = [];
      for (const lead of leads) {
        const existing = await prisma.outreach.findFirst({ where: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } } });
        if (existing) continue;
        try {
          const generated = await outreachService.generate({
            businessName: lead.businessName,
            ownerName: lead.ownerName,
            niche: lead.niche,
            country: lead.country,
            website: lead.website,
            whatsapp: lead.whatsapp,
            auditScore: lead.auditScore,
            notes: lead.notes,
          });
          const message = typeof generated?.whatsapp === 'string' ? generated.whatsapp.trim() : '';
          if (!message) throw new Error('AI returned no WhatsApp draft');
          await prisma.outreach.create({ data: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.DRAFT, message } });
          created++;
        } catch (error) {
          errors.push(`${lead.businessName}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return NextResponse.json({ success: true, action, considered: leads.length, created, errors });
    }

    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : [];
    if (!ids.length) return jsonError('ids are required');

    if (action === 'approve') {
      const result = await prisma.outreach.updateMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } }, data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), error: null } });
      return NextResponse.json({ success: true, action, updated: result.count });
    }

    if (action === 'cancel') {
      const result = await prisma.outreach.updateMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } }, data: { status: OutreachStatus.CANCELLED } });
      return NextResponse.json({ success: true, action, updated: result.count });
    }

    if (action === 'schedule') {
      const scheduledAt = new Date(body.scheduledAt ?? Date.now() + 5 * 60 * 1000);
      if (Number.isNaN(scheduledAt.getTime())) return jsonError('Invalid scheduledAt');
      const result = await prisma.outreach.updateMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVED }, data: { status: OutreachStatus.SCHEDULED, scheduledAt } });
      return NextResponse.json({ success: true, action, updated: result.count, scheduledAt });
    }

    if (action === 'send') {
      const results: Array<{ id: string; success: boolean; error?: string }> = [];
      for (const id of ids.slice(0, 25)) {
        try {
          await sendApprovedOutreach(id);
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error instanceof Error ? error.message : String(error) });
        }
      }
      return NextResponse.json({ success: true, action, results });
    }

    return jsonError('Unknown action. Use generate, approve, cancel, schedule or send.');
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 500);
  }
}
