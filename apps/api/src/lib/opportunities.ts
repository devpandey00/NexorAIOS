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
  applicationUrl?: string | null;
  applicationStatus?: string;
  appliedAt?: string | null;
  applicationError?: string | null;
  createdAt: string;
}

const prisma = getDatabaseClients().write;

const QUERY_TEMPLATES: Record<OpportunityKind, string[]> = {
  JOB: [
    'site:linkedin.com/jobs digital marketing remote jobs hiring',
    'site:indeed.com digital marketing remote jobs hiring',
    'site:naukri.com digital marketing remote jobs hiring',
    'site:internshala.com digital marketing remote jobs hiring',
    'site:cutshort.io digital marketing remote jobs hiring',
    'site:wellfound.com digital marketing remote jobs hiring',
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

function sourceFor(kind: OpportunityKind, url: string) {
  if (kind !== 'JOB') return 'web-search';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('indeed.com')) return 'Indeed';
  if (url.includes('naukri.com')) return 'Naukri';
  if (url.includes('internshala.com')) return 'Internshala';
  if (url.includes('cutshort.io')) return 'Cutshort';
  if (url.includes('wellfound.com')) return 'Wellfound';
  return 'web-search';
}

export async function discoverOpportunities(kind: OpportunityKind, location?: string, limit = 10) {
  const templates = QUERY_TEMPLATES[kind];
  const queryResults: Array<{ name: string; website?: string }> = [];

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
    const source = sourceFor(kind, url);
    const inserted = await prisma.$queryRaw<Opportunity[]>`
      INSERT INTO public.opportunities
        (kind, title, organization, url, source, location, notes, application_url)
      VALUES
        (${kind}, ${title}, ${title}, ${url}, ${source}, ${location ?? null},
         ${kind === 'JOB' ? 'Discovered by Nexor job-search autopilot. Application is queued for an authenticated portal session.' : `Discovered by Nexor ${kind.toLowerCase()} autopilot.`},
         ${kind === 'JOB' ? url : null})
      ON CONFLICT (kind, url) DO UPDATE SET
        updated_at = now(), source = EXCLUDED.source, application_url = COALESCE(public.opportunities.application_url, EXCLUDED.application_url)
      RETURNING
        id, kind, title, organization, url, source, location, notes, contact, status,
        application_url AS "applicationUrl", application_status AS "applicationStatus",
        applied_at AS "appliedAt", application_error AS "applicationError",
        created_at AS "createdAt"
    `;

    const row = inserted[0];
    if (row) opportunities.push({
      ...row,
      createdAt: new Date(row.createdAt).toISOString(),
      appliedAt: row.appliedAt ? new Date(row.appliedAt).toISOString() : null,
    });
    if (opportunities.length >= limit) break;
  }

  return opportunities;
}

export async function listOpportunities(input?: { kind?: OpportunityKind; status?: string; limit?: number }) {
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 200);
  return prisma.$queryRaw<Opportunity[]>`
    SELECT id, kind, title, organization, url, source, location, contact, notes, status,
           application_url AS "applicationUrl", application_status AS "applicationStatus",
           applied_at AS "appliedAt", application_error AS "applicationError",
           created_at AS "createdAt"
    FROM public.opportunities
    WHERE (${input?.kind ?? null}::text IS NULL OR kind = ${input?.kind ?? null})
      AND (${input?.status ?? null}::text IS NULL OR status = ${input?.status ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}
