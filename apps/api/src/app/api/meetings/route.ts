import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, MeetingStatus } from '@nexor/database';

const db = () => getDatabaseClients().write;

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get('leadId') ?? undefined;
    const meetings = await db().meeting.findMany({ where: leadId ? { leadId } : undefined, include: { lead: true, opportunity: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ success: true, meetings });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leadId = String(body.leadId ?? '');
    if (!leadId) return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
    const lead = await db().lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    const meeting = await db().meeting.create({ data: { leadId, title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : `Sales meeting — ${lead.businessName}`, status: body.status === MeetingStatus.SCHEDULED ? MeetingStatus.SCHEDULED : MeetingStatus.OFFERED, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined, durationMinutes: Number.isFinite(Number(body.durationMinutes)) ? Math.max(15, Math.min(240, Number(body.durationMinutes))) : 30, meetingUrl: typeof body.meetingUrl === 'string' ? body.meetingUrl : undefined, provider: typeof body.provider === 'string' ? body.provider : undefined, providerEventId: typeof body.providerEventId === 'string' ? body.providerEventId : undefined, notes: typeof body.notes === 'string' ? body.notes : undefined } });
    return NextResponse.json({ success: true, meeting }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
