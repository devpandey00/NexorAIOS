import { googleSearch } from '../providers/google.provider.js';
import { serperSearch } from '../providers/serper.provider.js';
import { webSearch } from '../providers/web.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return { success: true, count: 0, leads: [] };
    }

    const errors: string[] = [];

    // Prefer configured, structured providers. Fall back to public web search
    // so campaign discovery does not silently return an empty result set when
    // one provider is unavailable.
    if (process.env.GOOGLE_PLACES_API_KEY) {
      try {
        const leads = await googleSearch(normalizedQuery);
        if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'google-places' };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (process.env.SERPER_API_KEY) {
      try {
        const leads = await serperSearch(normalizedQuery);
        if (leads.length > 0) return { success: true, count: leads.length, leads, provider: 'serper' };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    try {
      const leads = await webSearch(normalizedQuery);
      return {
        success: true,
        count: leads.length,
        leads,
        provider: 'web',
        ...(leads.length === 0 && errors.length > 0 ? { providerErrors: errors } : {}),
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        success: false,
        count: 0,
        leads: [],
        providerErrors: errors,
      };
    }
  }
}

export const leadSearchService = new LeadSearchService();
