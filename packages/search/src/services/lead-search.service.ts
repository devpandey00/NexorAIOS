import { webSearch } from '../providers/web.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return {
        success: true,
        count: 0,
        leads: [],
      };
    }

    const leads = await webSearch(normalizedQuery);

    return {
      success: true,
      count: leads.length,
      leads,
    };
  }
}

export const leadSearchService = new LeadSearchService();
