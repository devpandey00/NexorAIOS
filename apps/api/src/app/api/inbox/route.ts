import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { createApproval } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const channel = new URL(request.url).searchParams.get('channel')?.toUpperCase();
  const db = getDatabaseClients().read;
  const conversations = await db.conversation.findMany({ where: channel ? { channel: channel as any } : undefined, include: { lead: true, messages: { orderBy: { createdAt: 'desc' }, take: 20 } }, orderBy: { lastMessageAt: 'desc' }, take: 200 });
  const enriched = conversations.map(c => { const last = c.messages[0]; return { ...c, lastMessage: last?.content ?? null, unreadCandidate: last?.direction === 'INBOUND', inboundCount: c.messages.filter(m => m.direction === 'INBOUND').length }; });
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
    const id = await createApproval({ action: `SEND_${channel}`, targetType: 'CONVERSATION', targetId: String(body.conversationId || body.leadId), payload: { leadId: String(body.leadId), channel, content: String(body.content).trim() }, reason: 'Outbound messaging is approval-gated.', userId: user.id });
    return NextResponse.json({ success: true, status: 'APPROVAL_REQUIRED', approvalId: id, note: 'Nothing was sent. Approve the action, then execute it through the configured provider.' }, { status: 202 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
