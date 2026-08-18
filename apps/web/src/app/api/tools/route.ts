import { NextRequest, NextResponse } from 'next/server';
import { assessLead, buildPersonalizedPitch } from '@nexor/core';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { researchService } from '@nexor/research';
import { campaignPlannerService, leadSearchService } from '@nexor/search';

export const runtime = 'nodejs';
export const maxDuration = 300;

const db = getDatabaseClients().write;

function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

function firstEmail(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value.find((x): x is string => typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.trim()))?.trim().toLowerCase() ?? null;
}

function firstPhone(value: unknown) {
  if (!Array.isArray(value)) return null;
  const found = value.find((x): x is string => typeof x === 'string' && x.replace(/\D/g, '').length >= 10 && x.replace(/\D/g, '').length <= 15);
  return found ? found.replace(/\D/g, '') : null;
}

async function researchAndStore(name: string, website: string, niche: string) {
  const existing = await db.lead.findFirst({ where: { website } });
  const lead = existing ?? await db.lead.create({
    data: { businessName: name, niche: niche || 'digital marketing prospect', country: 'Unknown', website },
  });

  const research = await researchService.analyze(website);
  if (!research.success) return { lead, research, outreach: null };

  const intelligence = assessLead({
    website: research.website,
    technology: research.technology,
    social: Object.fromEntries(Object.entries(research.social ?? {})),
    seo: Object.fromEntries(Object.entries(research.seo ?? {})),
  });
  const contacts = (research as unknown as { contacts?: { emails?: unknown; phones?: unknown } }).contacts;
  const email = firstEmail(contacts?.emails);
  const whatsapp = firstPhone(contacts?.phones);
  const message = buildPersonalizedPitch({
    businessName: name,
    requirement: intelligence.requirement,
    service: intelligence.service,
    findings: intelligence.findings,
  });

  const updatedLead = await db.lead.update({
    where: { id: lead.id },
    data: {
      email: lead.email ?? email,
      whatsapp: lead.whatsapp ?? whatsapp,
      auditScore: intelligence.score,
      status: 'PITCH_READY',
      notes: JSON.stringify({ research, intelligence, researchedAt: new Date().toISOString() }),
    },
  });

  const channel = updatedLead.whatsapp ? OutreachChannel.WHATSAPP : updatedLead.email ? OutreachChannel.EMAIL : null;
  let outreach = null;
  if (channel) {
    outreach = await db.outreach.findFirst({ where: { leadId: updatedLead.id, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } } });
    if (!outreach) outreach = await db.outreach.create({ data: { leadId: updatedLead.id, channel, status: OutreachStatus.DRAFT, message } });
  }

  return { lead: updatedLead, research, outreach };
}

export async function GET() {
  return NextResponse.json({ success: true, service: 'NexorAIOS tools', status: 'ready' });
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const tool = String(body.tool ?? '').trim();
    const input = String(body.input ?? '').trim();
    if (!tool) return NextResponse.json({ success: false, error: 'tool is required' }, { status: 400 });

    if (tool === 'Lead Finder') {
      const query = input || campaignPlannerService.plan(0).query;
      const found = await leadSearchService.search(query);
      const results = [];
      for (const item of found.leads.slice(0, 8)) {
        if (!item.website) continue;
        try { results.push(await researchAndStore(item.name, item.website, query)); }
        catch (error) { results.push({ name: item.name, website: item.website, error: error instanceof Error ? error.message : String(error) }); }
      }
      return NextResponse.json({ success: true, tool, query, discovered: found.count, processed: results.length, results });
    }

    if (tool === 'Website Audit') {
      if (!/^https?:\/\//i.test(input)) return NextResponse.json({ success: false, error: 'Enter a full URL beginning with https://' }, { status: 400 });
      const research = await researchService.analyze(input);
      if (!research.success) return NextResponse.json(research, { status: 422 });
      return NextResponse.json({ success: true, tool, audit: { website: research.website, seo: research.seo, technology: research.technology, social: research.social, contacts: research.contacts, analyzedAt: research.analyzedAt } });
    }

    if (tool === 'Outreach Draft') {
      if (!input) return NextResponse.json({ success: false, error: 'Enter a company name or website' }, { status: 400 });
      const website = /^https?:\/\//i.test(input) ? input : `https://${input}`;
      const name = input.replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./, '');
      const result = await researchAndStore(name, website, 'digital marketing');
      return NextResponse.json({ success: true, tool, lead: result.lead, outreach: result.outreach });
    }

    if (tool === 'Campaign Planner') {
      const plan = campaignPlannerService.plan(Math.max(0, Number(body.index ?? 0)));
      return NextResponse.json({ success: true, tool, plan, next: campaignPlannerService.plan(plan.rotationIndex + 1) });
    }

    if (tool === 'Daily Report') {
      const [leads, drafts, sent, followups] = await Promise.all([
        db.lead.count(),
        db.outreach.count({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.SCHEDULED, OutreachStatus.APPROVAL_REQUIRED] } } }),
        db.outreach.count({ where: { status: OutreachStatus.SENT } }),
        db.followUp.count({ where: { status: { in: ['PENDING', 'SCHEDULED'] } } }),
      ]);
      return NextResponse.json({ success: true, tool, report: { leads, drafts, sent, followups, generatedAt: new Date().toISOString() } });
    }

    return NextResponse.json({ success: false, error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (error) {
    console.error('[TOOLS]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
