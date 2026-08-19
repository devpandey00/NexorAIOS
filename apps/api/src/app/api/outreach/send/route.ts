import { NextRequest, NextResponse } from 'next/server';
import { ConversationChannel, FollowUpStatus, getDatabaseClients, LeadStatus, MessageDirection, OutreachChannel, OutreachStatus } from '@nexor/database';
import { sendWhatsApp } from '@/lib/whatsapp-sender';

const prisma = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

async function sendEmail(to: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email credentials are not configured');
  const lines = message.split('\n');
  const subject = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/i, '').trim() : 'A quick observation about your business';
  const text = lines[0]?.startsWith('Subject:') ? lines.slice(2).join('\n') : message;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? `Email send failed (${response.status})`);
  return data?.id as string | undefined;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  let id = '';
  try {
    const body = await req.json();
    id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const outreach = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
    if (!outreach) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (outreach.status === OutreachStatus.SENT) return NextResponse.json({ success: true, alreadySent: true, outreach });
    if (outreach.status !== OutreachStatus.APPROVED) return NextResponse.json({ success: false, error: 'Outreach must be approved before sending' }, { status: 409 });

    let providerMessageId: string | undefined;
    let conversationChannel: ConversationChannel;
    let recipient: string;
    if (outreach.channel === OutreachChannel.WHATSAPP) {
      recipient = outreach.lead.whatsapp ?? '';
      conversationChannel = ConversationChannel.WHATSAPP;
      if (!recipient) throw new Error('Lead has no WhatsApp number');
      providerMessageId = await sendWhatsApp(recipient, outreach.message);
    } else if (outreach.channel === OutreachChannel.EMAIL) {
      recipient = outreach.lead.email ?? '';
      conversationChannel = ConversationChannel.EMAIL;
      if (!recipient) throw new Error('Lead has no email address');
      providerMessageId = await sendEmail(recipient, outreach.message);
    } else {
      throw new Error(`Sending for ${outreach.channel} is not configured yet`);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.outreach.updateMany({ where: { id, status: OutreachStatus.APPROVED }, data: { status: OutreachStatus.SENT, sentAt: now, providerMessageId, error: null } });
      if (claimed.count !== 1) {
        const current = await tx.outreach.findUnique({ where: { id } });
        if (current?.status === OutreachStatus.SENT) return current;
        throw new Error('Outreach was claimed by another sender');
      }
      const conversation = await tx.conversation.upsert({ where: { leadId_channel: { leadId: outreach.leadId, channel: conversationChannel } }, create: { leadId: outreach.leadId, channel: conversationChannel, status: 'OPEN', lastMessageAt: now }, update: { lastMessageAt: now, status: 'OPEN' } });
      await tx.message.create({ data: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND, content: outreach.message, providerMessageId } });
      await tx.lead.update({ where: { id: outreach.leadId }, data: { status: LeadStatus.CONTACTED } });
      const existingFollowUp = await tx.followUp.findFirst({ where: { leadId: outreach.leadId, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] } } });
      if (!existingFollowUp) await tx.followUp.create({ data: { leadId: outreach.leadId, status: FollowUpStatus.PENDING, scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), notes: `Follow up after outreach ${outreach.id}` } });
      return tx.outreach.findUnique({ where: { id } });
    });
    return NextResponse.json({ success: true, outreach: result, recipient });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (id) await prisma.outreach.update({ where: { id }, data: { status: OutreachStatus.FAILED, error: errorMessage } }).catch(() => undefined);
    console.error('[OUTREACH SEND ERROR]', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
