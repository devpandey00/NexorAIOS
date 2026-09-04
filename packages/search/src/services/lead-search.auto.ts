import { googleSearch } from '../providers/google.provider.js';
import { serperSearch } from '../providers/serper.provider.js';
import { freeWebSearch } from '../providers/free.provider.js';
import { openStreetMapSearch } from '../providers/openstreetmap.provider.js';

export interface LeadSearchResult {
  success: boolean;
  count: number;
  leads: Awaited<ReturnType<typeof serperSearch>>;
  provider: string;
  errorCode?: string;
  providerErrors?: string[];
}

function dedupeLeads(leads: LeadSearchResult['leads']) {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = [lead.website, lead.phone, lead.name].map((value) => String(value ?? '').trim().toLowerCase().replace(/\/$/, '')).join('|');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class LeadSearchService {
  async search(query: string): Promise<LeadSearchResult> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { success: true, count: 0, leads: [], provider: 'none' };
    const errors: string[] = [];
    const mode = (process.env.SEARCH_PROVIDER ?? 'auto').toLowerCase();

    if (mode === 'auto' || mode === 'google') {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        try {
          const leads = await googleSearch(normalizedQuery);
          if (leads.length) return { success: true, count: leads.length, leads, provider: 'google-places', providerErrors: errors };
          errors.push('google-places: zero usable results');
        } catch (error) { errors.push(`google-places: ${error instanceof Error ? error.message : String(error)}`); }
      } else if (mode === 'google') errors.push('google-places: GOOGLE_PLACES_API_KEY is not configured');
    }

    if (mode === 'auto' || mode === 'serper') {
      if (process.env.SERPER_API_KEY) {
        try {
          const leads = await serperSearch(normalizedQuery);
          if (leads.length) return { success: true, count: leads.length, leads, provider: 'serper', providerErrors: errors };
          errors.push('serper: zero usable results');
        } catch (error) { errors.push(`serper: ${error instanceof Error ? error.message : String(error)}`); }
      } else if (mode === 'serper') errors.push('serper: SERPER_API_KEY is not configured');
    }

    if (mode === 'auto' || mode === 'free') {
      // OSM is the deterministic free fallback for local-business discovery. Run it
      // before scraping public search-engine HTML, which is frequently blocked on Vercel.
      try {
        const leads = await openStreetMapSearch(normalizedQuery);
        if (leads.length) return { success: true, count: leads.length, leads, provider: 'openstreetmap', providerErrors: errors };
        errors.push('openstreetmap: zero usable results');
      } catch (error) { errors.push(`openstreetmap: ${error instanceof Error ? error.message : String(error)}`); }

      try {
        const result = await freeWebSearch(normalizedQuery);
        if (result.leads.length) return { success: true, count: result.leads.length, leads: result.leads, provider: result.provider, providerErrors: [...errors, ...result.errors] };
        errors.push(...result.errors);
      } catch (error) { errors.push(`free-auto: ${error instanceof Error ? error.message : String(error)}`); }
    }

    return { success: false, count: 0, leads: [], provider: mode, errorCode: 'SEARCH_UNAVAILABLE', providerErrors: errors.length ? errors : ['No usable search results from configured providers.'] };
  }

  async searchMany(queries: string[]): Promise<LeadSearchResult> {
    const uniqueQueries = [...new Set(queries.map((query) => query.trim()).filter(Boolean))].slice(0, 8);
    const errors: string[] = [];
    const allLeads: LeadSearchResult['leads'] = [];
    const providers = new Set<string>();
    for (const query of uniqueQueries) {
      const result = await this.search(query);
      providers.add(result.provider);
      allLeads.push(...result.leads);
      if (result.providerErrors?.length) errors.push(...result.providerErrors.map((error) => `${query}: ${error}`));
    }
    const leads = dedupeLeads(allLeads);
    if (leads.length) return { success: true, count: leads.length, leads, provider: [...providers].join('+'), providerErrors: errors };
    return { success: false, count: 0, leads: [], provider: [...providers].join('+') || 'none', errorCode: 'SEARCH_UNAVAILABLE', providerErrors: errors.length ? errors : ['No usable search results for any discovery query.'] };
  }
}

export const leadSearchService = new LeadSearchService();
