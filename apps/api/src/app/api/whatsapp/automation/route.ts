import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus, TaskStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';
import { NEXOR_BRAND } from '@nexor/shared';
import { getInternationalPricing } from '@/lib/international-pricing';

export const runtime = 'nodejs';

function getPrisma() { return getDatabaseClients().write; }

const JOB_OR_CONTENT_PATTERNS = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\brecruitment\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\broundup\b/i, /\barticle\b/i, /\bnews\b/i, /\bhow to\b/i];
const NON_BUSINESS_PATHS = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;
const VALID_LEAD_TYPES = new Set(['BUSINESS', 'COMPANY', 'LOCAL_BUSINESS', 'AGENCY', 'PROFESSIONAL_SERVICE']);
const BLOCKED_SOURCES = new Set(['JOB', 'JOB_SEARCH', 'JOB-SEARCH', 'RECRUITMENT', 'CAREER', 'JOB_PORTAL']);

function parseNotes(notes: string | null) { if (!notes) return {} as Record<string, any>; try { const parsed = JSON.parse(notes); return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {}; } catch { return {}; } }
function leadEligibility(lead: { businessName: string; website: string | null; notes: string | null }) {
  const parsed = parseNotes(lead.notes); const metadata = parsed.metadata ?? parsed;
  const leadType = typeof metadata.leadType === 'string' ? metadata.leadType.toUpperCase() : ''; const source = typeof metadata.source === 'string' ? metadata.source.toUpperCase() : ''; const name = lead.businessName.trim();
  if (!name || JOB_OR_CONTENT_PATTERNS.some((pattern) => pattern.test(name))) return { ok: false, reason: 'Not an operational business lead' };
  if (BLOCKED_SOURCES.has(source) || (leadType && !VALID_LEAD_TYPES.has(leadType))) return { ok: false, reason: `Blocked lead type/source: ${leadType || 'unknown'} / ${source || 'unknown'}` };
  if (lead.website) { try { if (NON_BUSINESS_PATHS.test(new URL(lead.website).pathname)) return { ok: false, reason: 'Website is a job/content/listing page' }; } catch { return { ok: false, reason: 'Invalid lead website' }; } }
  return { ok: true, reason: 'Operational business lead', leadType: leadType || 'BUSINESS', source: source || 'UNKNOWN' };
}
function researchContext(notes: string | null) { const parsed = parseNotes(notes); return { research: parsed.research ?? {}, score: parsed.score ?? {}, metadata: parsed.metadata ?? {} }; }
function jsonError(message: string, status = 400) { return NextResponse.json({ success: false, error: message }, { status }); }

function fallbackWhatsAppDraft(lead: { businessName: string; ownerName: string | null; niche: string | null }, research: Record<string, any>) {
  const findings = [...(Array.isArray(research.weaknesses) ? research.weaknesses : []), ...(Array.isArray(research.opportunities) ? research.opportunities : [])];
  const verified = findings.find((item) => item && typeof item === 'object' && (item.basis === 'verified' || item.confidence >= 0.9) && typeof item.finding === 'string')?.finding;
  const greeting = lead.ownerName?.trim() ? `Hi ${lead.ownerName.trim()},` : `Hi ${lead.businessName.trim()} team,`;
  const observation = verified ? `One thing stood out in the research: ${verified}.` : `I came across ${lead.businessName.trim()} and wanted to share a practical growth idea.`;
  return `${greeting}\n\n${observation}\n\nI help businesses improve their website, Google/Meta Ads and lead generation. If you'd like, I can share a few specific suggestions for ${lead.businessName.trim()} without any obligation.\n\nBest,\n${NEXOR_BRAND.founder}\n${NEXOR_BRAND.name}`;
}

export async function GET() {
  const prisma = getPrisma();
  try {
    const [rawDrafts, rawApproved, scheduled, rawLeads, sent, failed, replies, tasks] = await Promise.all([
      prisma.outreach.findMany({ where: { channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] }, lead: { whatsapp: { not: null } } }, include: { lead: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.outreach.findMany({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVED, lead: { whatsapp: { not: null } } }, include: { lead: true }, orderBy: { approvedAt: 'asc' }, take: 100 }),
      prisma.outreach.findMany({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.SCHEDULED }, include: { lead: true }, orderBy: { scheduledAt: 'asc' }, take: 100 }),
      prisma.lead.findMany({ where: { status: { in: ['NEW', 'RESEARCHED', 'QUALIFIED', 'PITCH_READY'] } }, orderBy: { updatedAt: 'desc' }, take: 100 }),
      prisma.outreach.count({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.SENT } }),
      prisma.outreach.count({ where: { channel: OutreachChannel.WHATSAPP, status: OutreachStatus.FAILED } }),
      prisma.conversation.findMany({ where: { channel: 'WHATSAPP', status: { in: ['INTERESTED', 'MEETING_REQUEST', 'NEEDS_REPLY', 'REPLIED'] } }, include: { lead: true, messages: { orderBy: { createdAt: 'desc' }, take: 3 } }, orderBy: { lastMessageAt: 'desc' }, take: 50 }),
      prisma.task.findMany({ where: { status: TaskStatus.TODO, leadId: { not: null } }, include: { lead: true }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }], take: 50 }),
    ]);
    const drafts = rawDrafts.filter((item) => leadEligibility(item.lead).ok);
    const approved = rawApproved.filter((item) => leadEligibility(item.lead).ok && Boolean(item.lead.whatsapp));
    const existingOutreachLeadIds = new Set([...rawDrafts, ...rawApproved, ...scheduled].map((item) => item.leadId));
    const rejected = [...rawDrafts, ...rawApproved, ...scheduled].filter((item) => !leadEligibility(item.lead).ok).map((item) => ({ id: item.id, businessName: item.lead.businessName, reason: leadEligibility(item.lead).reason }));
    const notContactable = rawLeads.filter((lead) => leadEligibility(lead).ok && !lead.whatsapp && !existingOutreachLeadIds.has(lead.id)).slice(0, 50).map((lead) => ({ id: lead.id, businessName: lead.businessName, reason: 'NOT CONTACTABLE: WhatsApp number missing' }));
    return NextResponse.json({ success: true, stats: { drafts: drafts.length, approved: approved.length, scheduled: scheduled.length, sent, failed, replies: replies.length, notContactable: notContactable.length, rejected: rejected.length }, drafts, approved, scheduled, rejected, notContactable, replies, tasks });
  } catch (error) { return jsonError(error instanceof Error ? error.message : String(error), 500); }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  try {
    const body = await req.json(); const action = typeof body?.action === 'string' ? body.action : '';
    if (action === 'generate') {
      const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 25); const ids = Array.isArray(body.leadIds) ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string') : [];
      const leads = await prisma.lead.findMany({ where: { ...(ids.length ? { id: { in: ids } } : {}), status: { in: ['NEW', 'RESEARCHED', 'QUALIFIED', 'PITCH_READY'] }, whatsapp: { not: null } }, orderBy: { updatedAt: 'desc' }, take: 100 });
      let created = 0; let skipped = 0; const errors: string[] = []; const notContactable: string[] = []; const rejected: string[] = []; const generatedMessages = new Set<string>();
      for (const lead of leads) {
        if (created >= limit) break;
        const eligibility = leadEligibility(lead); if (!eligibility.ok) { rejected.push(`${lead.businessName}: ${eligibility.reason}`); continue; }
        const existing = await prisma.outreach.findFirst({ where: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } } }); if (existing) { skipped++; continue; }
        const context = researchContext(lead.notes); const pricing = getInternationalPricing(lead.country);
        let message = '';
        try {
          for (let attempt = 0; attempt < 2 && !message; attempt++) {
            try {
              const generated = await outreachService.generate({ businessName: lead.businessName, ownerName: lead.ownerName, niche: lead.niche, country: lead.country, website: lead.website, whatsapp: lead.whatsapp, auditScore: lead.auditScore, notes: lead.notes, verifiedResearch: context.research, verifiedScore: context.score, leadMetadata: { leadType: eligibility.leadType, source: eligibility.source }, internationalPricing: pricing, uniquenessInstruction: `Create a genuinely different WhatsApp message for ${lead.businessName}. Use one or two verified findings only. If a service is discussed, use only these standard ${pricing.currency} client-facing prices: website ${pricing.website}, Google Ads ${pricing.googleAds}/mo, Meta Ads ${pricing.metaAds}/mo, Google Business Profile setup ${pricing.googleBusinessProfile}, social media ${pricing.socialMedia}/mo. Ad spend is separate. Do not reveal INR or internal pricing. Do not reuse these drafts: ${Array.from(generatedMessages).slice(-5).join(' | ')}` });
              const candidate = typeof generated?.whatsapp === 'string' ? generated.whatsapp.trim() : '';
              if (candidate && !generatedMessages.has(candidate.toLowerCase())) message = candidate;
            } catch (error) {
              if (attempt === 1) errors.push(`${lead.businessName}: AI unavailable, used safe fallback draft (${error instanceof Error ? error.message : String(error)})`);
            }
          }
          if (!message) message = fallbackWhatsAppDraft(lead, context.research);
          if (generatedMessages.has(message.toLowerCase())) message = `${fallbackWhatsAppDraft(lead, context.research)}\n\n— ${lead.businessName}`;
          generatedMessages.add(message.toLowerCase());
          await prisma.outreach.create({ data: { leadId: lead.id, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.DRAFT, message } });
          created++;
        } catch (error) { errors.push(`${lead.businessName}: ${error instanceof Error ? error.message : String(error)}`); }
      }
      return NextResponse.json({ success: true, action, considered: leads.length, created, skipped, notContactable, rejected, errors });
    }
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown): id is string => typeof id === 'string') : []; if (!ids.length) return jsonError('ids are required');
    if (action === 'approve') {
      const candidates = await prisma.outreach.findMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } }, include: { lead: true } });
      const valid = candidates.filter((item) => leadEligibility(item.lead).ok && Boolean(item.lead.whatsapp)); const validIds = valid.map((item) => item.id); const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      const result = await prisma.outreach.updateMany({ where: { id: { in: validIds }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } }, data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt, error: null } });
      return NextResponse.json({ success: true, action, updated: result.count, rejected: candidates.length - validIds.length, autoSendAt: scheduledAt });
    }
    if (action === 'cancel') {
      const result = await prisma.outreach.updateMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } }, data: { status: OutreachStatus.CANCELLED } }); return NextResponse.json({ success: true, action, updated: result.count });
    }
    if (action === 'schedule') return jsonError('Manual scheduling is disabled. Approve the draft; Nexor will schedule it automatically.');
    if (action === 'send') return jsonError('Manual sending is disabled. Approve the draft; Nexor will send it automatically.');
    return jsonError('Unknown action. Use generate, approve or cancel.');
  } catch (error) { return jsonError(error instanceof Error ? error.message : String(error), 500); }
}
