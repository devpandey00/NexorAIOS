import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCommandCenter, listAgents } from '@/lib/aios-platform';
import { buildSalesMessage } from '@/lib/sales-message-engine';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const command = String(body.command || '').trim();
    if (!command) throw new Error('command is required');
    const normalized = command.toLowerCase();
    const data = await getCommandCenter();
    if (normalized.includes('hottest') || normalized.includes('hot leads')) {
      const db = getDatabaseClients().read;
      const leads = await db.lead.findMany({ where: { auditScore: { not: null } }, orderBy: { auditScore: 'desc' }, take: 10 });
      return NextResponse.json({ success: true, intent: 'HOT_LEADS', answer: leads.length ? leads.map(l => `${l.businessName} — ${l.auditScore}/100`).join('\n') : 'No scored leads found.', data: leads });
    }
    if (normalized.includes('what should') || normalized.includes('today')) {
      const actions = [
        data.operations.pendingApprovals ? `Review ${data.operations.pendingApprovals} pending approval(s).` : null,
        data.operations.followUpsDue ? `Handle ${data.operations.followUpsDue} follow-up(s) due now.` : null,
        data.sales.qualified ? `${data.sales.qualified} qualified lead(s) are ready for sales.` : null,
        data.finance.outstanding ? `₹${Math.round(data.finance.outstanding).toLocaleString('en-IN')} in invoice value is outstanding.` : null,
      ].filter(Boolean);
      return NextResponse.json({ success: true, intent: 'TODAY', answer: actions.length ? actions.join('\n') : 'No urgent actions detected from current data.', data });
    }
    if (normalized.includes('pipeline') || normalized.includes('revenue')) return NextResponse.json({ success: true, intent: 'REVENUE', answer: `Pipeline ₹${Math.round(data.sales.pipeline).toLocaleString('en-IN')} · weighted expected ₹${Math.round(data.sales.expectedRevenue).toLocaleString('en-IN')} · won leads ${data.sales.won}.`, data: data.finance });
    if (normalized.includes('agent')) return NextResponse.json({ success: true, intent: 'AGENTS', answer: (await listAgents()).map(a => `${a.name}: ${a.description}`).join('\n'), data: await listAgents() });
    if (body.lead && typeof body.lead === 'object') {
      const lead = body.lead;
      const message = buildSalesMessage({ businessName: String(lead.businessName || 'Business'), contactName: lead.contactName ? String(lead.contactName) : null, country: lead.country ? String(lead.country) : null, website: lead.website ? String(lead.website) : null, service: lead.service ? String(lead.service) : null, requirement: lead.requirement ? String(lead.requirement) : null, findings: Array.isArray(lead.findings) ? lead.findings.map(String).slice(0,5) : [], channel: String(lead.channel || 'WHATSAPP').toUpperCase() as any, stage: 'FIRST_TOUCH' });
      return NextResponse.json({ success: true, intent: 'OUTREACH', answer: message, data: { approvalRequired: true } });
    }
    return NextResponse.json({ success: true, intent: 'SUMMARY', answer: `NexorAIOS currently has ${data.sales.leads} leads, ${data.sales.qualified} qualified, ${data.sales.replies} replies, pipeline ₹${Math.round(data.sales.pipeline).toLocaleString('en-IN')}, and ${data.operations.pendingApprovals} pending approval(s). Ask about hot leads, today's work, pipeline/revenue, agents, or provide a lead for outreach.` });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
