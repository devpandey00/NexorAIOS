import { getDatabaseClients } from '@nexor/database';
import { NEXOR_BRAND } from '@nexor/shared';
import { getCommandCenter, ensureAiosPlatform, writeAudit, createApproval } from './aios-platform';
import { buildSalesSequence } from './sales-message-engine';

export type GrowthToolAction =
  | 'LEAD_HUNTER' | 'WEBSITE_AUDIT' | 'SOCIAL_AUDIT' | 'OUTREACH' | 'FOLLOW_UP'
  | 'QUALIFY' | 'PROPOSAL' | 'DEAL' | 'TREND_RADAR' | 'CONTENT_FACTORY' | 'REEL_SCRIPT'
  | 'CREATIVE_DIRECTOR' | 'CONTENT_CALENDAR' | 'PERFORMANCE_LEARNER' | 'REPURPOSE'
  | 'COMPETITOR_WATCH' | 'CEO_BRIEF' | 'ASK_NEXOR' | 'TASK_PRIORITIZER' | 'AI_MEMORY'
  | 'RISK_RADAR' | 'CASHFLOW' | 'INVOICE_REMINDER' | 'PROFITABILITY' | 'PNL'
  | 'PAYMENT_FOLLOWUP' | 'CLIENT_HEALTH' | 'REPORT' | 'RENEWAL';

const safeRows = async <T>(query: string, fallback: T[]): Promise<T[]> => {
  try { return await getDatabaseClients().read.$queryRawUnsafe<T[]>(query); } catch { return fallback; }
};

const text = (value: unknown, fallback = '') => String(value ?? fallback).trim();
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export async function runGrowthTool(action: GrowthToolAction, input: Record<string, unknown> = {}, userId?: string) {
  await ensureAiosPlatform();
  const db = getDatabaseClients().read;
  const name = text(input.businessName || input.companyName, 'Target business');
  const website = text(input.website);
  const industry = text(input.industry, 'business');
  const location = text(input.location);

  switch (action) {
    case 'LEAD_HUNTER': {
      const leads = await db.lead.findMany({ orderBy: [{ auditScore: 'desc' }, { createdAt: 'desc' }], take: clamp(Number(input.limit ?? 25), 1, 100) });
      return { action, query: { industry, location }, count: leads.length, prospects: leads.map(l => ({ id: l.id, businessName: l.businessName, website: l.website, country: l.country, score: l.auditScore, email: l.email, phone: l.phone, status: l.status })) };
    }
    case 'WEBSITE_AUDIT': {
      if (!website) return { action, status: 'INPUT_REQUIRED', message: 'Provide the prospect website URL.' };
      const checks = [
        ['Website conversion clarity', 'Check whether the first screen clearly states the offer and has one strong CTA.'],
        ['Mobile experience', 'Verify responsive layout, readable text, tap targets and mobile load experience.'],
        ['Trust signals', 'Look for reviews, proof, credentials, testimonials and clear business information.'],
        ['Lead capture', 'Check for a short enquiry/contact path and a clear response expectation.'],
        ['Local visibility', 'Check visible location/service-area information and local intent signals.'],
        ['Social proof', 'Check whether recent social proof is visible and consistent with the brand.'],
        ['Performance', 'Check image weight, script load and obvious speed bottlenecks.'],
        ['SEO basics', 'Check title, headings, indexability, structured data and service/location relevance.'],
      ];
      return { action, businessName: name, website, findings: checks.map(([title, recommendation], i) => ({ priority: i < 3 ? 'HIGH' : 'MEDIUM', title, recommendation })), salesAngle: `Offer a focused ${NEXOR_BRAND.name} growth audit covering conversion, acquisition and follow-up.` };
    }
    case 'SOCIAL_AUDIT': {
      const platform = text(input.platform, 'Instagram');
      return { action, platform, businessName: name, findings: [
        'Review posting consistency and recency.', 'Compare content mix across education, proof, offer and authority.',
        'Check profile CTA, contact path and offer clarity.', 'Review hooks, retention patterns and creative variety.',
        'Check whether content points to a measurable business goal.'
      ], opportunities: ['Consistent short-form video', 'Stronger CTAs', 'Repurposed educational content', 'Offer-led content series', 'Lead capture from social traffic'] };
    }
    case 'OUTREACH': {
      const channel = text(input.channel, 'WHATSAPP').toUpperCase() as any;
      const sequence = buildSalesSequence({ businessName: name, contactName: text(input.contactName), website, service: text(input.service, 'growth marketing'), requirement: text(input.requirement), findings: text(input.findings), country: text(input.country) }, channel);
      return { action, approvalRequired: true, sequence };
    }
    case 'FOLLOW_UP': {
      return { action, stages: [{ day: 1, intent: 'Helpful first follow-up' }, { day: 3, intent: 'Add one concrete observation' }, { day: 7, intent: 'Offer a low-friction next step' }, { day: 14, intent: 'Close the loop politely' }], rule: 'Stop when the prospect replies, opts out, or becomes qualified.' };
    }
    case 'QUALIFY': {
      const reply = text(input.reply);
      const positive = /(interested|yes|sure|send|price|pricing|call|meeting|details|let's talk|lets talk)/i.test(reply);
      const negative = /(no thanks|not interested|unsubscribe|remove me|stop)/i.test(reply);
      const score = negative ? 10 : positive ? 85 : 50;
      return { action, classification: negative ? 'COLD' : positive ? 'HOT' : 'WARM', score, nextAction: negative ? 'STOP_OUTREACH' : positive ? 'CREATE_TASK_AND_BOOK_MEETING' : 'FOLLOW_UP_WITH_VALUE' };
    }
    case 'PROPOSAL': {
      const service = text(input.service, 'Growth Marketing');
      return { action, status: 'DRAFT', approvalRequired: true, proposal: { brand: NEXOR_BRAND.name, client: name, problem: text(input.problem, 'Improve acquisition and conversion.'), strategy: text(input.strategy, `Integrated ${service} plan with measurable milestones.`), deliverables: Array.isArray(input.deliverables) ? input.deliverables : [service, 'Monthly reporting', 'Optimization and strategy'], timeline: text(input.timeline, '30-day initial sprint'), pricing: input.pricing ?? null, nextStep: 'Review and approve proposal before sending.' } };
    }
    case 'DEAL': {
      return { action, stages: ['PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'], recommendation: 'Move only from verified CRM events; never infer a won deal from a draft.' };
    }
    case 'TREND_RADAR': {
      return { action, status: 'READY', trends: ['Short-form educational video', 'Founder-led authority content', 'Problem/solution carousels', 'Before/after audit content', 'AI workflow demonstrations'], matching: industry ? `Prioritize trends relevant to ${industry}.` : 'Provide an industry to improve matching.' };
    }
    case 'CONTENT_FACTORY': {
      const topic = text(input.topic, `${industry} growth mistakes businesses should avoid`);
      return { action, topic, outputs: { reel: `Hook → problem → 3 practical points → CTA for ${NEXOR_BRAND.name}`, carousel: ['Hook', 'Problem', 'Insight 1', 'Insight 2', 'Insight 3', 'CTA'], linkedin: `A concise authority post about ${topic}.`, facebook: `A practical post about ${topic}.`, caption: `${topic}. Save this and use it as a checklist.`, hashtags: NEXOR_BRAND.defaultHashtags } };
    }
    case 'REEL_SCRIPT': {
      const topic = text(input.topic, 'Why businesses lose leads after generating them');
      return { action, topic, script: { hook: `You're not losing leads because you need more leads.`, scenes: ['0-3s: pattern-breaking hook', '3-8s: show the hidden leak', '8-18s: explain 3 fixes', '18-25s: show the desired workflow', '25-30s: clear CTA'], voiceover: `Explain ${topic} in a direct, practical way without invented statistics.`, cta: 'DM Nexor for a focused growth audit.' } };
    }
    case 'CREATIVE_DIRECTOR': {
      return { action, status: 'BRIEF_READY', inspirationRule: 'Use Pinterest/public content only as inspiration; create an original concept.', brief: { format: text(input.format, '9:16 Reel'), concept: text(input.topic, 'AI-powered growth workflow'), visualDirection: 'Clean premium agency aesthetic, high contrast typography, product/UI moments, human business context.', hook: text(input.hook, 'What if your agency could do this automatically?'), scenes: ['Problem', 'AI workflow', 'Result state', 'CTA'], brand: NEXOR_BRAND.name } };
    }
    case 'CONTENT_CALENDAR': {
      const days = clamp(Number(input.days ?? 30), 1, 60);
      const pillars = ['EDUCATION','PROOF','AUTHORITY','OFFER','FOUNDER','FAQ','BEHIND_THE_SCENES'];
      return { action, days, calendar: Array.from({ length: days }, (_, i) => ({ day: i + 1, pillar: pillars[i % pillars.length], format: ['REEL','CAROUSEL','LINKEDIN','STATIC'][i % 4], status: 'DRAFT' })) };
    }
    case 'PERFORMANCE_LEARNER': {
      const rows = await safeRows<{ platform: string; status: string; count: bigint }>(`SELECT platform::text, status::text, count(*)::bigint AS count FROM public.content_posts GROUP BY platform,status`, []);
      return { action, data: rows.map(r => ({ ...r, count: Number(r.count) })), recommendation: 'Use verified engagement/conversion metrics when provider analytics are connected; do not infer ROI from post counts.' };
    }
    case 'REPURPOSE': {
      const source = text(input.content, text(input.topic, 'Source content'));
      return { action, source, variants: ['30-second Reel script','Carousel outline','LinkedIn authority post','Facebook post','Instagram caption','Story sequence','Email newsletter','Short X post','FAQ answer','Lead magnet outline'].map(type => ({ type, instruction: `Transform the source into ${type} while preserving facts.` })) };
    }
    case 'COMPETITOR_WATCH': {
      return { action, competitor: name, inputs: ['public website', 'public social activity', 'public offers', 'public content themes'], output: ['positioning gaps','content gaps','offer gaps','differentiation ideas'], rule: 'Only use publicly accessible information.' };
    }
    case 'CEO_BRIEF': {
      const command = await getCommandCenter();
      return { action, generatedAt: new Date().toISOString(), commandCenter: command, priorities: [command.operations.followUpsDue > 0 ? 'Clear follow-ups due today.' : 'No overdue follow-ups detected.', command.operations.pendingApprovals > 0 ? 'Review pending approvals.' : 'Approval queue is clear.', command.sales.qualified > 0 ? 'Advance qualified leads.' : 'Generate and research more prospects.'] };
    }
    case 'ASK_NEXOR': {
      const q = text(input.question).toLowerCase();
      const command = await getCommandCenter();
      if (/lead|prospect/.test(q)) return { answer: `There are ${command.sales.leads} leads, ${command.sales.qualified} qualified and ${command.sales.won} won in the current CRM snapshot.`, data: command.sales };
      if (/revenue|money|pipeline/.test(q)) return { answer: `Current pipeline is ${command.sales.pipeline} with weighted expected revenue ${command.sales.expectedRevenue}.`, data: command.finance };
      if (/follow|task|today/.test(q)) return { answer: `${command.operations.followUpsDue} follow-ups and ${command.operations.tasksDue} due tasks need attention.`, data: command.operations };
      return { answer: 'I can answer from the current NexorAIOS command-center data. Try asking about leads, revenue, pipeline, follow-ups or tasks.', data: command };
    }
    case 'TASK_PRIORITIZER': {
      const rows = await safeRows<{ id: string; title: string; due_at: string | null }>(`SELECT id::text, title, due_at::text FROM public.tasks WHERE status <> 'COMPLETED' ORDER BY due_at ASC NULLS LAST LIMIT 50`, []);
      return { action, tasks: rows.map((r, i) => ({ ...r, priority: i < 5 ? 'HIGH' : 'NORMAL' })) };
    }
    case 'AI_MEMORY': {
      const lead = text(input.leadId);
      if (!lead) return { action, status: 'INPUT_REQUIRED', message: 'Provide a leadId for a real CRM memory snapshot.' };
      const rows = await safeRows<Record<string, unknown>>(`SELECT id::text, "businessName", "website", "status", "auditScore", "createdAt"::text FROM public.leads WHERE id = '${lead.replace(/'/g, "''")}' LIMIT 1`, []);
      return { action, memory: rows[0] ?? null, source: 'CRM' };
    }
    case 'RISK_RADAR': {
      const command = await getCommandCenter();
      return { action, risks: [
        ...(command.operations.followUpsDue > 0 ? [{ severity: 'HIGH', issue: `${command.operations.followUpsDue} follow-ups are due.` }] : []),
        ...(command.operations.pendingApprovals > 0 ? [{ severity: 'MEDIUM', issue: `${command.operations.pendingApprovals} approvals are waiting.` }] : []),
        ...(command.finance.outstanding > 0 ? [{ severity: 'MEDIUM', issue: `${command.finance.outstanding} in invoices are outstanding.` }] : []),
      ] };
    }
    case 'CASHFLOW': {
      const rows = await safeRows<{ status: string; total: string }>(`SELECT status, COALESCE(SUM(total),0)::text AS total FROM public.aios_invoices GROUP BY status`, []);
      return { action, invoices: rows, paid: (await safeRows<{ total: string }>(`SELECT COALESCE(SUM(amount),0)::text AS total FROM public.aios_payments WHERE status IN ('RECORDED','CONFIRMED')`, [{ total: '0' }]))[0]?.total ?? '0' };
    }
    case 'INVOICE_REMINDER':
    case 'PAYMENT_FOLLOWUP': {
      const due = text(input.amount, 'the outstanding balance');
      return { action, approvalRequired: true, message: `Hi ${name}, a quick reminder regarding ${due}. Please let us know if you need the invoice or payment details resent. Thank you — ${NEXOR_BRAND.name}.` };
    }
    case 'PROFITABILITY': {
      const revenue = Number(input.revenue ?? 0); const cost = Number(input.cost ?? 0);
      return { action, revenue, cost, grossProfit: revenue - cost, margin: revenue ? ((revenue - cost) / revenue) * 100 : 0 };
    }
    case 'PNL': {
      const revenue = Number(input.revenue ?? 0); const expenses = Number(input.expenses ?? 0);
      return { action, revenue, expenses, net: revenue - expenses, margin: revenue ? ((revenue - expenses) / revenue) * 100 : 0 };
    }
    case 'CLIENT_HEALTH': {
      const client = name;
      const signals = { communication: Number(input.communication ?? 50), delivery: Number(input.delivery ?? 50), performance: Number(input.performance ?? 50), payment: Number(input.payment ?? 50) };
      const score = Math.round(Object.values(signals).reduce((a, b) => a + clamp(b, 0, 100), 0) / 4);
      return { action, client, score, status: score >= 75 ? 'HEALTHY' : score >= 50 ? 'WATCH' : 'AT_RISK', signals, nextAction: score < 50 ? 'Schedule client-success review.' : 'Continue current cadence.' };
    }
    case 'REPORT': {
      const command = await getCommandCenter();
      return { action, client: name, generatedAt: new Date().toISOString(), sections: ['Executive summary','Campaign performance','Lead pipeline','Social content','Finance','Next actions'], data: command };
    }
    case 'RENEWAL': {
      const health = await runGrowthTool('CLIENT_HEALTH', input, userId);
      return { action, client: name, health, recommendation: health.status === 'HEALTHY' ? 'Prepare renewal/expansion proposal.' : 'Resolve client risks before renewal conversation.' };
    }
    default: throw new Error(`Unsupported growth tool: ${action}`);
  }
}

export async function queueGrowthApproval(action: string, payload: unknown, userId?: string) {
  const id = await createApproval({ action, targetType: 'GROWTH_TOOL', payload, reason: 'External side effect requires explicit approval.', userId });
  if (userId) await writeAudit({ userId, action: 'GROWTH_TOOL_QUEUED', targetType: 'GROWTH_TOOL', targetId: id, after: payload });
  return id;
}
