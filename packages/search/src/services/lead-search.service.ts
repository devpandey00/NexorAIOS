import { googleSearch } from '../providers/google.provider.js';
import { serperSearch } from '../providers/serper.provider.js';
import { freeWebSearch } from '../providers/free.provider.js';
import { webSearch } from '../providers/web.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return { success: true, count: 0, leads: [] };
    }

    const errors: string[] = [];

    // Prefer configured structured providers when explicitly available.
    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const leads = await googleSearch(normalizedQuery);
        if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'google-places' };
      } catch (error) {
        errors.push(`google-places: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (process.env.SERPER_API_KEY) {
      try {
        const leads = await serperSearch(normalizedQuery);
        if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'serper' };
      } catch (error) {
        errors.push(`serper: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Free-first discovery is the mandatory fallback. This path does not
    // require SERPER_API_KEY and routes DDG -> Bing -> optional SearXNG.
    try {
      const free = await freeWebSearch(normalizedQuery);
      if (free.leads.length > 0) {
        return {
          success: true,
          count: free.leads.length,
          leads: free.leads,
          provider: free.provider,
          ...(free.errors.length ? { providerErrors: [...errors, ...free.errors] } : errors.length ? { providerErrors: errors } : {}),
        };
      }
      errors.push(...free.errors);
    } catch (error) {
      errors.push(`free-search: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Last-resort legacy web provider. It is intentionally after the
    // free-first provider so the campaign never depends on one parser.
    try {
      const leads = await webSearch(normalizedQuery);
      if (leads.length > 0) {
        return { success: true, count: leads.length, leads, provider: 'legacy-web', ...(errors.length ? { providerErrors: errors } : {}) };
      }
    } catch (error) {
      errors.push(`legacy-web: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      success: true,
      count: 0,
      leads: [],
      provider: 'free-auto',
      providerErrors: errors.length ? errors : ['All configured and free discovery providers returned zero usable results.'],
    };
  }
}

export const leadSearchService = new LeadSearchService();
