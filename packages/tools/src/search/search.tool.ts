import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { leadSearchService } from '@nexor/search';

export const searchTool: Tool = {
  id: 'search', name: 'Web Search', description: 'Search the configured Nexor discovery providers directly.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const query = typeof input.query === 'string' ? input.query.trim() : String(input.command ?? '').trim();
    if (!query) return { success: false, error: 'query is required' };
    try {
      const result = await leadSearchService.search(query);
      return result.success
        ? { success: true, data: result }
        : { success: false, data: result, error: result.providerErrors?.slice(-5).join(' | ') ?? 'Search unavailable' };
    } catch (error) {
      return { success: false, error: `Search execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
