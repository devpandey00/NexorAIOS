import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';

function getPrisma() { return getDatabaseClients().write; }

const JOB_OR_CONTENT_PATTERNS = [
  /\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i,
  /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\brecruitment\b/i,
  /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i,
  /\broundup\b/i, /\barticle\b/i, /\bnews\b/i, /\bhow to\b/i,
];
const NON_BUSINESS_PATHS = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;
const VALID_LEAD_TYPES = new Set(['BUSINESS', 'COMPANY', 'LOCAL_BUSINESS', 'AGENCY', 'PROFESSIONAL_SERVICE']);
const BLOCKED_SOURCES = new Set(['JOB', 'JOB_SEARCH', 'JOB-SEARCH', 'RECRUITMENT', 'CAREER', 'JOB_PORTAL']);

function parseNotes(notes: string | null) {
  if (!notes) return {} as Record<string, any>;
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {} as Record<string, any>;
  } catch {
    return {} as Record<string, any>;
  }
}

function validateBusinessLead(lead: { businessName: string; website: string | null; notes: string | null; whatsapp: string | null }) {
  const parsed = parseNotes(lead.notes);
  const metadata = parsed.metadata ?? parsed;
  const leadType = typeof metadata.leadType === 'string' ? metadata.leadType.toUpperCase() : '';
  const source = typeof metadata.source === 'string' ? metadata.source.toUpperCase() : '';
  if (!lead.businessName.trim() || JOB_OR_CONTENT_PATTERNS.some((pattern) => pattern.test(lead.businessName))) return { ok: false, reason: 'Blocked job/content/non-business lead' };
  if (BLOCKED_SOURCES.has(source) || (leadType && !VALID_LEAD_TYPES.has(leadType))) return { ok: false, reason: `Blocked lead type/source: ${leadType || 'unknown'} / ${source || 'unknown'}` };
  if (lead.website) {
    try {
      if (NON_BUSINESS_PATHS.test(new URL(lead.website).pathname)) return { ok: false, reason: 'Blocked job/content/listing website' };
    } catch {
      return { ok: false, reason: 'Invalid lead website' };
    }
  }
  return { ok: true, leadType: leadType || 'BUSINESS', source: source || 'UNKNOWN', parsed };
}

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

function normalizeChannel(value: unknown): OutreachChannel | null {
  if (Object.values(OutreachChannel).includes(value as OutreachChannel)) return value as OutreachChannel;
  return null;
}

function buildMessage(channel: OutreachChannel, lead: { businessName: string; ownerName: string | null }, context: string) {
  const name = lead.ownerName || lead.businessName;
  if (channel === OutreachChannel.EMAIL) {
    return `Subject: A quick growth observation for ${lead.businessName}\n\nHi ${name},\n\nI had a look at ${lead.businessName} and noticed a few opportunities around online lead generation. ${context}\n\nI can share the specific opportunities and a practical action plan if useful.\n\nRegards,\nNexor Media`;
  }
  return `Hi ${name}, I was looking at ${lead.businessName} and noticed a few opportunities to improve online lead generation. ${context} I can send you the specific ideas if you'd like. — Nexor Media`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const prisma = getPrisma();
  const drafts = await prisma.outreach.findMany({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } }, include: { lead: true, campaign: true }, orderBy: { createdAt: 'asc' }, take: 200 });
  return NextResponse.json({ success: true, count: drafts.length, drafts });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const channel = normalizeChannel(body.channel);
    const context = typeof body.context === 'string' ? body.context.trim() : '';
    const supported: OutreachChannel[] = [OutreachChannel.WHATSAPP, OutreachChannel.EMAIL, OutreachChannel.INSTAGRAM, OutreachChannel.FACEBOOK, OutreachChannel.LINKEDIN];
    if (!leadId || !channel || !supported.includes(channel)) return NextResponse.json({ success: false, error: 'leadId and a supported outreach channel are required' }, { status: 400 });
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    const validation = validateBusinessLead(lead);
    if (!validation.ok) return NextResponse.json({ success: false, error: validation.reason }, { status: 422 });
    if (channel === OutreachChannel.WHATSAPP && !lead.whatsapp) return NextResponse.json({ success: false, error: 'NOT CONTACTABLE: WhatsApp number missing' }, { status: 422 });
    const existing = await prisma.outreach.findFirst({ where: { leadId, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } }, orderBy: { createdAt: 'desc' } });
    if (existing) return NextResponse.json({ success: true, duplicate: true, outreach: existing });
    let message = '';
    if (channel === OutreachChannel.WHATSAPP) {
      const parsed = validation.parsed ?? {};
      const generated = await outreachService.generate({ businessName: lead.businessName, ownerName: lead.ownerName, niche: lead.niche, country: lead.country, website: lead.website, whatsapp: lead.whatsapp, auditScore: lead.auditScore, notes: lead.notes, verifiedResearch: parsed.research ?? {}, verifiedScore: parsed.score ?? {}, leadMetadata: { leadType: validation.leadType, source: validation.source }, uniquenessInstruction: `Create a unique first-contact WhatsApp message for ${lead.businessName}. Use one or two specific verified findings from this lead only. ${context}` });
      message = typeof generated?.whatsapp === 'string' ? generated.whatsapp.trim() : '';
      if (!message) return NextResponse.json({ success: false, error: 'AI could not produce a personalized WhatsApp draft' }, { status: 502 });
    } else {
      message = buildMessage(channel, lead, context || 'Your current digital presence looks like it has room for measurable improvements.');
    }
    const outreach = await prisma.$transaction(async (tx) => {
      const created = await tx.outreach.create({ data: { leadId, channel, status: OutreachStatus.APPROVAL_REQUIRED, message } });
      await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.PITCH_READY } });
      return created;
    });
    return NextResponse.json({ success: true, outreach }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const action = body.action === 'approve' ? 'approve' : body.action === 'cancel' ? 'cancel' : '';
    if (!id || !action) return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    const existing = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    const awaitingApproval: OutreachStatus[] = [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED];
    if (!awaitingApproval.includes(existing.status)) return NextResponse.json({ success: false, error: `Outreach is not awaiting approval. Current status: ${existing.status}` }, { status: 409 });
    if (action === 'approve') {
      const validation = validateBusinessLead(existing.lead);
      if (!validation.ok) return NextResponse.json({ success: false, error: validation.reason }, { status: 422 });
      if (existing.channel === OutreachChannel.WHATSAPP && !existing.lead.whatsapp) return NextResponse.json({ success: false, error: 'NOT CONTACTABLE: WhatsApp number missing' }, { status: 422 });
    }
    const status = action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED;
    const scheduledAt = action === 'approve' ? new Date(Date.now() + 5 * 60 * 1000) : null;
    const draft = await prisma.outreach.update({ where: { id }, data: { status, approvedAt: action === 'approve' ? new Date() : null, scheduledAt, error: null } });
    return NextResponse.json({ success: true, draft, autoSendAt: scheduledAt });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
