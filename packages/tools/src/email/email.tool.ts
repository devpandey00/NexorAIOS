import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const base = () => String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const emailTool: Tool = {
  id: 'email', name: 'Email Outreach', description: 'Send an approved email outreach record through the Nexor API.', category: 'communication',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const id = typeof input.id === 'string' ? input.id : '';
    if (!id) return { success: false, error: 'approved outreach id is required' };
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (process.env.OUTREACH_API_SECRET) headers.authorization = `Bearer ${process.env.OUTREACH_API_SECRET}`;
    const response = await fetch(`${base()}/api/outreach/send`, { method: 'POST', headers, body: JSON.stringify({ id }) });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { success: true, data } : { success: false, error: data?.error ?? data?.message ?? `Email send failed (${response.status})` };
  },
};
