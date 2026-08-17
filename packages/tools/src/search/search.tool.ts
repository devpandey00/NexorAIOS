import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const searchTool: Tool = {
  id: 'search', name: 'Web Search', description: 'Search the configured Nexor discovery API.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const base = String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const response = await fetch(`${base}/api/discovery/queries`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { success: true, data } : { success: false, error: data?.error ?? data?.message ?? `Search failed (${response.status})` };
  },
};
