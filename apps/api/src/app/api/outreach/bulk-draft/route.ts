import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';

const prisma = getDatabaseClients().write;
const MAX_BATCH = 100;
const SUPPORTED_CHANNELS: OutreachChannel[] = [OutreachChannel.EMAIL, OutreachChannel.WHATSAPP];

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

function buildMessage(channel: OutreachChannel, lead: { businessName: string; ownerName: string | null; website: string | null; auditScore: number | null }) {
  const name = lead.ownerName || lead.businessName;
  const observation = lead.auditScore !== null ? `I noticed a few measurable growth opportunities in your current online presence (audit score ${lead.auditScore}/100).` : 'I noticed a few measurable growth opportunities in your current online presence.';
  if (channel === OutreachChannel.EMAIL) return `Subject: Quick growth observation for ${lead.businessName}\n\nHi ${name},\n\nI was looking at ${lead.businessName}${lead.website ? ` (${lead.website})` : ''}. ${observation}\n\nI can send over the specific opportunities and a short action plan if useful.\n\nRegards,\nNexor Media`;
  return `Hi ${name}, I was looking at ${lead.businessName} and noticed a few measurable growth opportunities in your online presence. I can send the specific observations and a short action plan if useful. — Nexor Media`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const requestedLimit = Number(body?.limit ?? MAX_BATCH);
    const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : MAX_BATCH, 1), MAX_BATCH);
    const requestedChannels = Array.isArray(body?.channels) ? body.channels : [];
    const channels: OutreachChannel[] = requestedChannels.length
      ? requestedChannels.filter((value: unknown): value is OutreachChannel => SUPPORTED_CHANNELS.includes(value as OutreachChannel))
      : SUPPORTED_CHANNELS;
    const leads = await prisma.lead.findMany({ where: { status: { in: [LeadStatus.QUALIFIED, LeadStatus.PITCH_READY] }, OR: [{ email: { not: null } }, { whatsapp: { not: null } }] }, orderBy: [{ auditScore: 'desc' }, { createdAt: 'desc' }], take: limit });
    let created = 0;
    let skipped = 0;
    for (const lead of leads) {
      for (const channel of channels) {
        if (channel === OutreachChannel.EMAIL && !lead.email) continue;
        if (channel === OutreachChannel.WHATSAPP && !lead.whatsapp) continue;
        const existing = await prisma.outreach.findFirst({ where: { leadId: lead.id, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED, OutreachStatus.SENT] } }, select: { id: true } });
        if (existing) { skipped++; continue; }
        await prisma.outreach.create({ data: { leadId: lead.id, channel, status: OutreachStatus.APPROVAL_REQUIRED, message: buildMessage(channel, lead) } });
        created++;
      }
    }
    return NextResponse.json({ success: true, scanned: leads.length, created, skipped, mode: 'approval_required' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
