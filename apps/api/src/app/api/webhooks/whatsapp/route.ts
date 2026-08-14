import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  FollowUpStatus,
  getDatabaseClients,
  LeadStatus,
  MessageDirection,
  ConversationChannel,
  TaskStatus,
} from '@nexor/database';
import { replyClassifierService } from '@nexor/ai';

export const runtime = 'nodejs';

const prisma = getDatabaseClients().write;

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith('sha256=')) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const supplied = signature.slice(7);
  if (expected.length !== supplied.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    challenge &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    let processed = 0;

    for (const entry of entries) {
      for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
        const value = change?.value;
        const messages = Array.isArray(value?.messages) ? value.messages : [];

        for (const incoming of messages) {
          if (incoming?.type !== 'text' || typeof incoming?.text?.body !== 'string') continue;

          const from = String(incoming.from ?? '').replace(/\D/g, '');
          const text = incoming.text.body.trim();
          if (!from || !text) continue;

          const lead =
            (await prisma.lead.findFirst({ where: { whatsapp: from } })) ??
            (await prisma.lead.findFirst({ where: { whatsapp: { endsWith: from } } }));

          if (!lead) {
            console.warn(`[WHATSAPP WEBHOOK] No lead matched ${from}`);
            continue;
          }

          const now = new Date();
          const conversation = await prisma.conversation.upsert({
            where: {
              leadId_channel: {
                leadId: lead.id,
                channel: ConversationChannel.WHATSAPP,
              },
            },
            create: {
              leadId: lead.id,
              channel: ConversationChannel.WHATSAPP,
              status: 'REPLIED',
              lastMessageAt: now,
            },
            update: {
              status: 'REPLIED',
              lastMessageAt: now,
            },
          });

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: MessageDirection.INBOUND,
              content: text,
              providerMessageId: incoming.id ? String(incoming.id) : undefined,
            },
          });

          await prisma.lead.update({
            where: { id: lead.id },
            data: { status: LeadStatus.REPLIED },
          });

          await prisma.followUp.updateMany({
            where: {
              leadId: lead.id,
              status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] },
            },
            data: { status: FollowUpStatus.CANCELLED, notes: 'Cancelled because lead replied' },
          });

          try {
            const recent = await prisma.message.findMany({
              where: { conversationId: conversation.id },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { direction: true, content: true },
            });

            const classification = await replyClassifierService.classify({
              businessName: lead.businessName,
              leadContext: {
                niche: lead.niche,
                country: lead.country,
                website: lead.website,
                auditScore: lead.auditScore,
              },
              recentMessages: recent.reverse(),
              incomingMessage: text,
            });

            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { status: classification.intent },
            });

            const taskStatus = classification.nextAction === 'STOP_OUTREACH'
              ? TaskStatus.COMPLETED
              : TaskStatus.TODO;

            await prisma.task.create({
              data: {
                leadId: lead.id,
                title: `${classification.nextAction}: ${lead.businessName}`,
                description: [
                  `AI intent: ${classification.intent}`,
                  `Confidence: ${classification.confidence}`,
                  `Summary: ${classification.summary}`,
                  `Suggested reply: ${classification.suggestedReply}`,
                  `Incoming message: ${text}`,
                ].join('\n'),
                status: taskStatus,
                priority: classification.intent === 'MEETING_REQUEST' ? 1 : classification.intent === 'INTERESTED' ? 2 : 3,
              },
            });
          } catch (classificationError) {
            console.error('[WHATSAPP CLASSIFICATION ERROR]', classificationError);
            await prisma.task.create({
              data: {
                leadId: lead.id,
                title: `MANUAL_REVIEW: ${lead.businessName}`,
                description: `AI classification failed. Review inbound WhatsApp message manually.\n\n${text}`,
                status: TaskStatus.TODO,
                priority: 1,
              },
            });
          }

          processed++;
        }
      }
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
