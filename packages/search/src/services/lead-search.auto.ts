import { googleSearch } from '../providers/google.provider.js';
import { serperSearch } from '../providers/serper.provider.js';
import { freeWebSearch } from '../providers/free.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return { success: true, count: 0, leads: [], provider: 'free-auto' };

    const errors: string[] = [];
    const mode = (process.env.SEARCH_PROVIDER ?? 'auto').toLowerCase();

    // Free-first is the default and does not require any paid API key.
    if (mode === 'auto' || mode === 'free') {
      try {
        const result = await freeWebSearch(normalizedQuery);
        if (result.leads.length > 0) {
          return {
            success: true,
            count: result.leads.length,
            leads: result.leads,
            provider: result.provider,
            ...(result.errors.length ? { providerErrors: result.errors } : {}),
          };
        }
        errors.push(...result.errors);
      } catch (error) {
        errors.push(`free-auto: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Optional structured providers are used only when configured.
    if (mode === 'auto' || mode === 'google') {
      if (process.env.GOOGLE_PLACES_API_KEY) {
        try {
          const leads = await googleSearch(normalizedQuery);
          if (leads.length > 0) {
            return { success: true, count: leads.length, leads, provider: 'google-places', providerErrors: errors };
          }
          errors.push('google-places: zero usable results');
        } catch (error) {
          errors.push(`google-places: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    if (mode === 'auto' || mode === 'serper') {
      if (process.env.SERPER_API_KEY) {
        try {
          const leads = await serperSearch(normalizedQuery);
          if (leads.length > 0) {
            return { success: true, count: leads.length, leads, provider: 'serper', providerErrors: errors };
          }
          errors.push('serper: zero usable results');
        } catch (error) {
          errors.push(`serper: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Do not fall through to the old single-parser provider. It was the source
    // of the misleading production message "web-legacy: no usable business results".
    // A zero result is a diagnosable provider failure, never a fake success.
    return {
      success: false,
      count: 0,
      leads: [],
      provider: 'free-auto',
      errorCode: 'SEARCH_UNAVAILABLE',
      providerErrors: errors.length ? errors : ['No usable search results from free or configured providers.'],
    };
  }
}

export const leadSearchService = new LeadSearchService();
