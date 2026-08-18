import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';

export const runtime = 'nodejs';
const db = getDatabaseClients().write;

export async function POST(req: NextRequest) {
  try {
    const { outreachId, scheduleAt, whatsappOptIn } = await req.json();
    if (typeof outreachId !== 'string') return NextResponse.json({ success: false, error: 'outreachId is required' }, { status: 400 });
    const outreach = await db.outreach.findUnique({ where: { id: outreachId }, include: { lead: true } });
    if (!outreach) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });

    let notes: Record<string, unknown> = {};
    try { notes = JSON.parse(outreach.lead.notes ?? '{}'); } catch { notes = {}; }
    if (outreach.channel === OutreachChannel.WHATSAPP && whatsappOptIn !== true) return NextResponse.json({ success: false, error: 'WhatsApp outreach requires recorded recipient opt-in' }, { status: 400 });
    if (outreach.channel === OutreachChannel.WHATSAPP) notes.whatsappOptIn = true;

    const when = scheduleAt ? new Date(scheduleAt) : new Date();
    if (Number.isNaN(when.getTime())) return NextResponse.json({ success: false, error: 'Invalid scheduleAt' }, { status: 400 });

    await db.lead.update({ where: { id: outreach.leadId }, data: { notes: JSON.stringify(notes) } });
    const updated = await db.outreach.update({ where: { id: outreachId }, data: { status: OutreachStatus.SCHEDULED, scheduledAt: when, approvedAt: new Date(), error: null } });
    return NextResponse.json({ success: true, outreach: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
