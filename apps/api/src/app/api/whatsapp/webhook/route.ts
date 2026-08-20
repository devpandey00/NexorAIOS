import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, LeadStatus, MessageDirection, TaskStatus } from '@nexor/database';
import { replyClassifierService } from '@nexor/ai';

export const runtime = 'nodejs';

const prisma = getDatabaseClients().write;

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!signature?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const supplied = signature.slice('sha256='.length);
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function textFromMessage(message: any) {
  if (message?.type === 'text' && typeof message.text?.body === 'string') return message.text.body.trim();
  if (message?.type === 'button' && typeof message.button?.text === 'string') return message.button.text.trim();
  if (message?.type === 'interactive') return String(message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? '').trim();
  return '';
}

function mapConversationStatus(intent: string) {
  switch (intent) {
    case 'INTERESTED': return 'INTERESTED';
    case 'MEETING_REQUEST': return 'MEETING_REQUEST';
    case 'PRICE_REQUEST': return 'NEEDS_REPLY';
    case 'QUESTION': return 'NEEDS_REPLY';
    case 'NOT_INTERESTED': return 'NOT_INTERESTED';
    case 'NOT_NOW': return 'NOT_NOW';
    case 'WRONG_PERSON': return 'WRONG_PERSON';
    case 'OUT_OF_OFFICE': return 'OUT_OF_OFFICE';
    default: return 'REPLIED';
  }
}

async function processIncomingMessage(message: any) {
  const from = typeof message?.from === 'string' ? normalizePhone(message.from) : '';
  const body = textFromMessage(message);
  const providerMessageId = typeof message?.id === 'string' ? message.id : undefined;
  if (!from || !body) return { ignored: true, reason: 'Unsupported or empty message' };

  const lead = await prisma.lead.findFirst({ where: { whatsapp: { not: null } }, orderBy: { updatedAt: 'desc' } }).then(async (candidate) => {
    if (candidate && normalizePhone(candidate.whatsapp ?? '') === from) return candidate;
    const matches = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM public.leads WHERE regexp_replace(COALESCE(whatsapp, ''), '\\D', '', 'g') = ${from} LIMIT 1`;
    return matches[0] ? prisma.lead.findUnique({ where: { id: matches[0].id } }) : null;
  });

  if (!lead) return { ignored: true, reason: 'No matching lead for WhatsApp sender' };

  if (providerMessageId) {
    const duplicate = await prisma.message.findFirst({ where: { providerMessageId }, select: { id: true } });
    if (duplicate) return { duplicate: true, leadId: lead.id };
  }

  const conversation = await prisma.conversation.upsert({
    where: { leadId_channel: { leadId: lead.id, channel: 'WHATSAPP' } },
    create: { leadId: lead.id, channel: 'WHATSAPP', status: 'OPEN', lastMessageAt: new Date() },
    update: { lastMessageAt: new Date() },
  });

  const recentMessages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 8, select: { direction: true, content: true } });
  const classification = await replyClassifierService.classify({
    businessName: lead.businessName,
    leadContext: { niche: lead.niche, country: lead.country, website: lead.website, auditScore: lead.auditScore, notes: lead.notes },
    recentMessages: recentMessages.reverse(),
    incomingMessage: body,
  });

  const status = mapConversationStatus(classification.intent);
  await prisma.$transaction(async (tx) => {
    await tx.message.create({ data: { conversationId: conversation.id, direction: MessageDirection.INBOUND, content: body, providerMessageId } });
    await tx.conversation.update({ where: { id: conversation.id }, data: { status, lastMessageAt: new Date() } });
    await tx.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.REPLIED } });

    if (classification.nextAction !== 'STOP_OUTREACH') {
      const title = classification.nextAction === 'BOOK_MEETING'
        ? `Book meeting with ${lead.businessName}`
        : classification.nextAction === 'SEND_PRICING'
          ? `Send pricing to ${lead.businessName}`
          : classification.nextAction === 'FOLLOW_UP_LATER'
            ? `Follow up with ${lead.businessName}`
            : `Reply to ${lead.businessName}`;
      await tx.task.create({ data: { leadId: lead.id, title, description: `${classification.summary}\nSuggested reply: ${classification.suggestedReply}`, status: TaskStatus.TODO, priority: classification.nextAction === 'BOOK_MEETING' ? 1 : 2 } });
    }
  });

  return { leadId: lead.id, conversationId: conversation.id, intent: classification.intent, nextAction: classification.nextAction, confidence: classification.confidence };
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');
  if (mode !== 'subscribe' || !challenge || token !== process.env.WHATSAPP_VERIFY_TOKEN) return NextResponse.json({ success: false, error: 'Webhook verification failed' }, { status: 403 });
  return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain' } });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) return NextResponse.json({ success: false, error: 'Invalid webhook signature' }, { status: 401 });

  try {
    const payload = JSON.parse(rawBody);
    const results: unknown[] = [];
    for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        const messages = Array.isArray(change?.value?.messages) ? change.value.messages : [];
        for (const message of messages) results.push(await processIncomingMessage(message));
      }
    }
    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
