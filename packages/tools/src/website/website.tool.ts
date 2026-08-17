import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const websiteTool: Tool = {
  id: 'website', name: 'Website Analyzer', description: 'Run website research against the Nexor research API.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) return { success: false, error: 'url is required' };
    const base = String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const response = await fetch(`${base}/api/research`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, url }) });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { success: true, data } : { success: false, error: data?.error ?? data?.message ?? `Website analysis failed (${response.status})` };
  },
};
