import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@nexor/core';
import { LeadStatus } from '@nexor/database';
import { CreateLeadSchema } from '@/lib/validators/lead';
import { assertTransition } from '@/lib/lead-state-machine';

function isValidOperationalLead(lead: { businessName: string; status: LeadStatus }) {
  if (lead.status === LeadStatus.LOST) return false;
  return ![/\bbest\b/i,/\btop\b/i,/\blist\b/i,/\bdirectory\b/i,/\bguide\b/i,/\broundup\b/i,/\barticles?\b/i,/\bhow to\b/i,/\bstrategy\b/i,/\bpatients?\b/i,/\bget \d+x\b/i].some((pattern) => pattern.test(lead.businessName));
}

export async function GET() {
  try {
    const result = await leadService.findAll({ page: 1, pageSize: 100 });
    const data = result.data.filter(isValidOperationalLead);
    return NextResponse.json({ ...result, data, total: data.length });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = CreateLeadSchema.parse(await request.json());
    const existing = await leadService.findAll({ search: body.businessName, page: 1, pageSize: 5 });
    const exact = existing.data.find((lead) => lead.businessName.toLowerCase() === body.businessName.toLowerCase());
    if (exact) return NextResponse.json({ success: true, duplicate: true, lead: exact }, { status: 200 });
    const lead = await leadService.create(body);
    return NextResponse.json({ success: true, duplicate: false, lead }, { status: 201 });
  } catch (error) { console.error('LEADS API ERROR:', error); return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json(); const id = typeof body.id === 'string' ? body.id : ''; if (!id) return NextResponse.json({ success: false, message: 'id is required' }, { status: 400 });
    const status = body.status as LeadStatus | undefined;
    if (status && !Object.values(LeadStatus).includes(status)) return NextResponse.json({ success: false, message: 'Invalid lead status' }, { status: 400 });
    const auditScore = body.auditScore === undefined ? undefined : Number(body.auditScore);
    if (auditScore !== undefined && (!Number.isInteger(auditScore) || auditScore < 0 || auditScore > 100)) return NextResponse.json({ success: false, message: 'auditScore must be an integer from 0 to 100' }, { status: 400 });
    const current = await leadService.findById(id);
    if (!current) return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    if (status) assertTransition(current.status, status);
    const closedStatuses: LeadStatus[] = [LeadStatus.MEETING_BOOKED, LeadStatus.PROPOSAL_SENT, LeadStatus.WON, LeadStatus.LOST];
    if (status && closedStatuses.includes(status)) return NextResponse.json({ success: false, message: 'Use the dedicated Sales API for this transition' }, { status: 409 });
    const lead = await leadService.update(id, { ...(status ? { status } : {}), ...(auditScore !== undefined ? { auditScore } : {}), ...(typeof body.notes === 'string' ? { notes: body.notes } : {}) });
    if (status && status !== current.status) {
      const { getDatabaseClients } = await import('@nexor/database');
      await getDatabaseClients().write.activityEvent.create({ data: { leadId: id, type: 'LEAD_STATUS_CHANGED', message: `Lead status changed: ${current.status} → ${status}`, metadata: { from: current.status, to: status } } });
    }
    return NextResponse.json({ success: true, lead });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
