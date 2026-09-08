import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

type ApiData = { error?: string; message?: string } & Record<string, unknown>;

export const websiteTool: Tool = {
  id: 'website', name: 'Website Analyzer', description: 'Run website research against the Nexor research API.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) return { success: false, error: 'url is required' };
    const configuredBase = process.env.NEXOR_API_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
    const vercelUrl = process.env.VERCEL_URL?.trim();
    const base = (configuredBase ? configuredBase : vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000').replace(/\/$/, '');
    const response = await fetch(`${base}/api/research`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, url }) });
    const data = (await response.json().catch(() => ({}))) as ApiData;
    return response.ok ? { success: true, data } : { success: false, error: data.error ?? data.message ?? `Website analysis failed (${response.status})` };
  },
};
