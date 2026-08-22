import { getDatabaseClients } from '@nexor/database';
import { leadSearchService } from '@nexor/search';

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
}

function getPrisma() {
  return getDatabaseClients().write;
}

const QUERY_TEMPLATES: Record<OpportunityKind, string[]> = {
  JOB: [
    'digital marketing remote jobs hiring',
    'performance marketing manager remote jobs hiring',
    'social media manager remote jobs hiring',
    'SEO specialist remote jobs hiring',
  ],
  COMPANY: [
    'local businesses hiring digital marketing agency',
    'companies looking for lead generation agency',
    'businesses looking for Google Ads agency',
    'companies looking for social media marketing agency',
  ],
  INFLUENCER: [
    'business influencers marketing collaboration',
    'entrepreneur influencers marketing collaboration',
    'real estate influencers collaboration business',
    'local business creators collaboration',
  ],
};

export async function discoverOpportunities(kind: OpportunityKind, location?: string, limit = 10) {
  const prisma = getPrisma();
  const templates = QUERY_TEMPLATES[kind];
  const queryResults = [] as Array<{ name: string; website?: string }>;

  for (const template of templates) {
    const query = location ? `${template} ${location}` : template;
    const result = await leadSearchService.search(query);
    queryResults.push(...result.leads);
    if (queryResults.length >= limit * 2) break;
  }

  const seen = new Set<string>();
  const opportunities: Opportunity[] = [];

  for (const result of queryResults) {
    const url = String(result.website ?? '').trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const title = String(result.name ?? '').trim() || url;
    const inserted = await prisma.$queryRaw<Opportunity[]>`
      INSERT INTO public.opportunities
        (kind, title, organization, url, source, location, notes)
      VALUES
        (${kind}, ${title}, ${title}, ${url}, 'web-search', ${location ?? null}, ${`Discovered by Nexor ${kind.toLowerCase()} autopilot.`})
      ON CONFLICT (kind, url) DO UPDATE SET updated_at = now()
      RETURNING
        id, kind, title, organization, url, source, location, contact, notes, status,
        created_at AS "createdAt"
    `;

    const row = inserted[0];
    if (row) opportunities.push({ ...row, createdAt: new Date(row.createdAt).toISOString() });
    if (opportunities.length >= limit) break;
  }

  return opportunities;
}

export async function listOpportunities(input?: { kind?: OpportunityKind; status?: string; limit?: number }) {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  return prisma.$queryRaw<Opportunity[]>`
    SELECT id, kind, title, organization, url, source, location, contact, notes, status,
           created_at AS "createdAt"
    FROM public.opportunities
    WHERE (${input?.kind ?? null}::text IS NULL OR kind = ${input?.kind ?? null})
      AND (${input?.status ?? null}::text IS NULL OR status = ${input?.status ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
