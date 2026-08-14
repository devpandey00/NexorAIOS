import { NextRequest, NextResponse } from 'next/server';
import {
  getDatabaseClients,
  ConversationChannel,
  MessageDirection,
  OutreachChannel,
  OutreachStatus,
  FollowUpStatus,
} from '@nexor/database';

const prisma = getDatabaseClients().write;

async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error('WhatsApp credentials are not configured');

  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'text', text: { body: message } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? 'WhatsApp send failed');
  return data?.messages?.[0]?.id as string | undefined;
}

async function sendEmail(to: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email credentials are not configured');

  const lines = message.split('\n');
  const subject = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/i, '') : 'A quick observation about your business';
  const body = lines[0]?.startsWith('Subject:') ? lines.slice(2).join('\n') : message;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message ?? 'Email send failed');
  return data?.id as string | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    const outreach = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
    if (!outreach) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (outreach.status !== OutreachStatus.APPROVED) {
      return NextResponse.json({ success: false, error: 'Outreach must be approved before sending' }, { status: 409 });
    }

    let providerMessageId: string | undefined;
    let conversationChannel: ConversationChannel;
    let recipient: string | undefined;

    if (outreach.channel === OutreachChannel.WHATSAPP) {
      recipient = outreach.lead.whatsapp ?? undefined;
      conversationChannel = ConversationChannel.WHATSAPP;
      if (!recipient) throw new Error('Lead has no WhatsApp number');
      providerMessageId = await sendWhatsApp(recipient, outreach.message);
    } else if (outreach.channel === OutreachChannel.EMAIL) {
      recipient = outreach.lead.email ?? undefined;
      conversationChannel = ConversationChannel.EMAIL;
      if (!recipient) throw new Error('Lead has no email address');
      providerMessageId = await sendEmail(recipient, outreach.message);
    } else {
      throw new Error(`Sending for ${outreach.channel} is not configured yet`);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const sent = await tx.outreach.update({
        where: { id },
        data: { status: OutreachStatus.SENT, sentAt: now, providerMessageId, error: null },
      });

      const conversation = await tx.conversation.upsert({
        where: { leadId_channel: { leadId: outreach.leadId, channel: conversationChannel } },
        create: { leadId: outreach.leadId, channel: conversationChannel, lastMessageAt: now },
        update: { lastMessageAt: now, status: 'OPEN' },
      });

      await tx.message.create({
        data: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND, content: outreach.message, providerMessageId },
      });

      await tx.followUp.create({
        data: {
          leadId: outreach.leadId,
          status: FollowUpStatus.PENDING,
          scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          notes: `Follow up after outreach ${outreach.id}`,
        },
      });

      return sent;
    });

    return NextResponse.json({ success: true, outreach: result, recipient });
  } catch (error) {
    console.error('[OUTREACH SEND ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
