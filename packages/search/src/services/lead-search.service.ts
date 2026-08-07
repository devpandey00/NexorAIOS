import { googleSearch } from '../providers/google.provider.js';

export class LeadSearchService {
  async search(query: string) {
    const leads = await googleSearch(query);

    return {
      success: true,
      count: leads.length,
      leads,
    };
  }
}

export const leadSearchService = new LeadSearchService();
