import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';

const prisma = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

function normalizeChannel(value: unknown): OutreachChannel | null {
  if (value === 'WHATSAPP') return OutreachChannel.WHATSAPP;
  if (value === 'EMAIL') return OutreachChannel.EMAIL;
  return null;
}

function buildMessage(channel: OutreachChannel, lead: { businessName: string; ownerName: string | null }, context: string) {
  const name = lead.ownerName || lead.businessName;
  if (channel === OutreachChannel.EMAIL) {
    return `Subject: A quick growth observation for ${lead.businessName}\n\nHi ${name},\n\nI had a look at ${lead.businessName} and noticed a few opportunities around online lead generation. ${context}\n\nI can share the specific opportunities and a practical action plan if useful.\n\nRegards,\nNexor Media`;
  }
  return `Hi ${name}, I was looking at ${lead.businessName} and noticed a few opportunities to improve online lead generation. ${context} I can send you the specific ideas if you'd like. — Nexor Media`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const drafts = await prisma.outreach.findMany({
    where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } },
    include: { lead: true, campaign: true },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  return NextResponse.json({ success: true, count: drafts.length, drafts });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const channel = normalizeChannel(body.channel);
    const context = typeof body.context === 'string' ? body.context.trim() : '';
    if (!leadId || !channel) return NextResponse.json({ success: false, error: 'leadId and channel (WHATSAPP or EMAIL) are required' }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    if (channel === OutreachChannel.WHATSAPP && !lead.whatsapp) return NextResponse.json({ success: false, error: 'Lead has no WhatsApp number' }, { status: 422 });
    if (channel === OutreachChannel.EMAIL && !lead.email) return NextResponse.json({ success: false, error: 'Lead has no email address' }, { status: 422 });

    const existing = await prisma.outreach.findFirst({
      where: { leadId, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return NextResponse.json({ success: true, duplicate: true, outreach: existing });

    const outreach = await prisma.$transaction(async (tx) => {
      const created = await tx.outreach.create({ data: { leadId, channel, status: OutreachStatus.APPROVAL_REQUIRED, message: buildMessage(channel, lead, context || 'Your current digital presence looks like it has room for measurable improvements.') } });
      await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.PITCH_READY } });
      return created;
    });

    return NextResponse.json({ success: true, outreach }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action === 'approve' ? 'approve' : body.action === 'cancel' ? 'cancel' : '';
    if (!id || !action) return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    const existing = await prisma.outreach.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (![OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED].includes(existing.status)) return NextResponse.json({ success: false, error: `Outreach is not awaiting approval. Current status: ${existing.status}` }, { status: 409 });
    const status = action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED;
    const draft = await prisma.outreach.update({ where: { id }, data: { status, approvedAt: action === 'approve' ? new Date() : null } });
    return NextResponse.json({ success: true, draft });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
