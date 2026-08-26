import { googleSearch } from '../providers/google.provider.js';
import { serperSearch } from '../providers/serper.provider.js';
import { webSearch } from '../providers/web.provider.js';
import { freeWebSearch } from '../providers/free.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { success: true, count: 0, leads: [], provider: 'free-auto' };

    const errors: string[] = [];
    const mode = (process.env.SEARCH_PROVIDER ?? 'auto').toLowerCase();

    if (mode === 'auto' || mode === 'free') {
      try {
        const result = await freeWebSearch(normalizedQuery);
        if (result.leads.length > 0) {
          return { success: true, count: result.leads.length, leads: result.leads, provider: result.provider, providerErrors: result.errors };
        }
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`free-auto: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (mode === 'auto' || mode === 'google') {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        try {
          const leads = await googleSearch(normalizedQuery);
          if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'google-places', providerErrors: errors };
        } catch (error) {
          errors.push(`google-places: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (mode === 'auto' || mode === 'serper') {
      if (process.env.SERPER_API_KEY) {
        try {
          const leads = await serperSearch(normalizedQuery);
          if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'serper', providerErrors: errors };
        } catch (error) {
          errors.push(`serper: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (mode === 'auto' || mode === 'free' || mode === 'web') {
      try {
        const leads = await webSearch(normalizedQuery);
        if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'web-legacy', providerErrors: errors };
        errors.push('web-legacy: no usable business results');
      } catch (error) {
        errors.push(`web-legacy: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      success: false,
      count: 0,
      leads: [],
      provider: mode === 'auto' ? 'free-auto' : mode,
      providerErrors: errors.length ? errors : ['No search provider returned usable business results'],
    };
  }
}

export const leadSearchService = new LeadSearchService();
