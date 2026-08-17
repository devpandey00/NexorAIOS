import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { leadSearchService } from '@nexor/search';

export const leadDiscoveryTool: Tool = {
  id: 'lead_discovery',
  name: 'Lead Discovery',
  description: 'Find real prospect websites through the configured search provider.',
  category: 'sales',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const query = typeof input.query === 'string' ? input.query.trim() : String(input.command ?? '').trim();
    if (!query) return { success: false, error: 'query is required' };

    try {
      const limit = typeof input.limit === 'number' ? Math.max(1, Math.min(50, Math.floor(input.limit))) : 25;
      const result = await leadSearchService.search(query);
      const leads = result.leads.slice(0, limit).map((lead) => ({
        name: lead.name,
        website: lead.website,
      }));
      return { success: true, data: { query, count: leads.length, leads } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};
