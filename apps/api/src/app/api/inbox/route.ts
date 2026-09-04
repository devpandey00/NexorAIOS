import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const channel = new URL(request.url).searchParams.get('channel')?.toUpperCase();
  const db = getDatabaseClients().read;
  const conversations = await db.conversation.findMany({
    where: channel ? { channel: channel as any } : undefined,
    include: { lead: true, messages: { orderBy: { createdAt: 'desc' }, take: 20 } },
    orderBy: { lastMessageAt: 'desc' }, take: 200,
  });
  const enriched = conversations.map(c => {
    const last = c.messages[0];
    const inbound = c.messages.filter(m => m.direction === 'INBOUND').length;
    return { ...c, lastMessage: last?.content ?? null, unreadCandidate: last?.direction === 'INBOUND', inboundCount: inbound };
  });
  return NextResponse.json({ success: true, conversations: enriched });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const channel = String(body.channel || '').toUpperCase();
    if (!['WHATSAPP','EMAIL','INSTAGRAM','LINKEDIN','FACEBOOK','SMS'].includes(channel)) throw new Error('Unsupported channel');
    if (!body.leadId || !String(body.content || '').trim()) throw new Error('leadId and content are required');
    const db = getDatabaseClients().write;
    const conversation = await db.conversation.upsert({ where: { leadId_channel: { leadId: String(body.leadId), channel: channel as any } }, create: { leadId: String(body.leadId), channel: channel as any }, update: {} });
    const message = await db.message.create({ data: { conversationId: conversation.id, direction: 'OUTBOUND', content: String(body.content).trim() } });
    await db.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
    return NextResponse.json({ success: true, status: 'MANUAL_PENDING', conversationId: conversation.id, messageId: message.id, note: 'Message recorded. Provider sending remains separate and must be confirmed by the provider.' }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
