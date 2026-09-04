import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { NEXOR_BRAND } from '@nexor/shared';
import { writeAudit } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const db = getDatabaseClients().read;
  const proposals = await db.proposal.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ success: true, proposals });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const opportunityId = String(body.opportunityId || '');
    if (!opportunityId) throw new Error('opportunityId is required');
    const db = getDatabaseClients().write;
    const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId }, include: { lead: true } });
    if (!opportunity) throw new Error('Opportunity not found');
    const services = Array.isArray(body.services) ? body.services.map(String).filter(Boolean).slice(0, 10) : [];
    const scope = String(body.scope || services.join(', ') || 'Growth marketing strategy and execution');
    const title = String(body.title || `${NEXOR_BRAND.name} Growth Proposal — ${opportunity.lead.businessName}`);
    const content = String(body.content || [
      `${NEXOR_BRAND.name} — Growth Proposal`,
      `Client: ${opportunity.lead.businessName}`,
      `Business need: ${body.problem || 'Improve digital acquisition and conversion.'}`,
      `Recommended scope: ${scope}`,
      `Deliverables: ${services.length ? services.join(', ') : scope}`,
      `Timeline: ${body.timeline || 'To be agreed after kickoff.'}`,
      `Next step: Approve this proposal so onboarding can begin.`,
    ].join('\n\n'));
    const proposal = await db.proposal.create({ data: { opportunityId, title, scope, content, value: body.value == null ? undefined : Number(body.value), currency: body.currency ? String(body.currency) : 'INR' } });
    await writeAudit({ userId: user.id, action: 'PROPOSAL_CREATED', targetType: 'PROPOSAL', targetId: proposal.id, after: { title, opportunityId } });
    return NextResponse.json({ success: true, proposal }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
