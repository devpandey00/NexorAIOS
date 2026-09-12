import { getDatabaseClients } from '@nexor/database';
import { leadSearchService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { assessLead, buildSalesBrief } from '@nexor/core';

export type OpportunityKind = 'JOB' | 'COMPANY' | 'INFLUENCER';

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  title: string;
  organization: string | null;
  url: string;
  source: string | null;
  location: string | null;
  contact: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  opportunityScore?: number;
  recommendedService?: string | null;
  requirement?: string | null;
  findings?: string[];
  salesAngle?: string | null;
  nextAction?: string | null;
}

function getPrisma() { return getDatabaseClients().write; }

const QUERY_TEMPLATES: Record<OpportunityKind, string[]> = {
  JOB: ['digital marketing remote jobs hiring', 'performance marketing manager remote jobs hiring', 'social media manager remote jobs hiring', 'SEO specialist remote jobs hiring'],
  COMPANY: ['local businesses looking for digital marketing agency', 'companies looking for lead generation agency', 'businesses looking for Google Ads agency', 'companies looking for social media marketing agency'],
  INFLUENCER: ['business influencers marketing collaboration', 'entrepreneur influencers marketing collaboration', 'real estate influencers collaboration business', 'local business creators collaboration'],
};

function hydrate(row: Opportunity): Opportunity {
  try {
    const parsed = row.notes ? JSON.parse(row.notes) : {};
    const intelligence = parsed.intelligence ?? {};
    const salesBrief = parsed.salesBrief ?? {};
    return {
      ...row,
      opportunityScore: Number(intelligence.score ?? 0),
      recommendedService: intelligence.service ?? salesBrief.recommendedService ?? null,
      requirement: intelligence.requirement ?? null,
      findings: Array.isArray(intelligence.findings) ? intelligence.findings.slice(0, 5) : [],
      salesAngle: salesBrief.salesAngle ?? null,
      nextAction: salesBrief.nextAction ?? null,
    };
  } catch { return row; }
}

export async function discoverOpportunities(kind: OpportunityKind, location?: string, limit = 10) {
  const prisma = getPrisma();
  const templates = QUERY_TEMPLATES[kind];
  const queryResults = [] as Array<{ name: string; website?: string; phone?: string; address?: string }>;

  for (const template of templates) {
    const query = location ? `${template} ${location}` : template;
    const result = await leadSearchService.search(query);
    queryResults.push(...result.leads);
    if (queryResults.length >= limit * 3) break;
  }

  const seen = new Set<string>();
  const opportunities: Opportunity[] = [];

  for (const result of queryResults) {
    const url = String(result.website ?? '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const title = String(result.name ?? '').trim() || url;
    let lead = await prisma.lead.findFirst({ where: { website: url } });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          businessName: title,
          niche: kind === 'JOB' ? 'hiring prospect' : kind === 'INFLUENCER' ? 'business influencer prospect' : 'company prospect',
          country: location?.trim() || 'Unknown',
          website: url,
          whatsapp: result.phone?.replace(/\D/g, '').slice(0, 30) || undefined,
          status: 'NEW',
        },
      });
    }

    let intelligence: any = { score: 50, requirement: 'Manual review required', service: 'Conversion Optimization', findings: ['Website research was not available for this prospect.'] };
    let salesBrief: any = null;
    try {
      const research = await researchService.analyze(url);
      if (research.success) {
        intelligence = assessLead({ website: research.website, technology: research.technology, social: Object.fromEntries(Object.entries(research.social ?? {})), seo: Object.fromEntries(Object.entries(research.seo ?? {})) });
        salesBrief = buildSalesBrief({ businessName: title, niche: lead.niche, country: location?.trim() || lead.country, website: url, intelligence, research, phone: result.phone, email: research.contacts?.emails?.[0] });
        await prisma.lead.update({ where: { id: lead.id }, data: { auditScore: intelligence.score, status: intelligence.score >= 60 ? 'QUALIFIED' : 'RESEARCHED', email: research.contacts?.emails?.[0] ?? lead.email, whatsapp: research.contacts?.phones?.[0]?.replace(/\D/g, '').slice(0, 30) ?? lead.whatsapp, notes: JSON.stringify({ source: 'opportunity-hunter', intelligence, salesBrief }) } });
      }
    } catch (error) {
      console.warn('[OPPORTUNITY HUNTER] research failed', { url, error: error instanceof Error ? error.message : String(error) });
    }

    const notes = JSON.stringify({ source: 'opportunity-hunter', intelligence, salesBrief });
    const inserted = await prisma.$queryRaw<Opportunity[]>`
      INSERT INTO public.opportunities (lead_id, kind, title, name, organization, url, source, location, notes)
      VALUES (${lead.id}, ${kind}, ${title}, ${title}, ${title}, ${url}, 'opportunity-hunter', ${location ?? null}, ${notes})
      ON CONFLICT (kind, url) DO UPDATE SET updated_at = now(), lead_id = EXCLUDED.lead_id, name = EXCLUDED.name, notes = EXCLUDED.notes, source = EXCLUDED.source, location = EXCLUDED.location
      RETURNING id, kind, title, organization, url, source, location, contact, notes, status, created_at AS "createdAt"
    `;
    const row = inserted[0];
    if (row) opportunities.push(hydrate({ ...row, createdAt: new Date(row.createdAt).toISOString() }));
    if (opportunities.length >= limit) break;
  }

  return opportunities.sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
}

export async function listOpportunities(input?: { kind?: OpportunityKind; status?: string; limit?: number }) {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  const rows = await prisma.$queryRaw<Opportunity[]>`
    SELECT id, kind, title, organization, url, source, location, contact, notes, status, created_at AS "createdAt"
    FROM public.opportunities
    WHERE (${input?.kind ?? null}::text IS NULL OR kind = ${input?.kind ?? null})
      AND (${input?.status ?? null}::text IS NULL OR status = ${input?.status ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((row) => hydrate({ ...row, createdAt: new Date(row.createdAt).toISOString() })).sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
}
