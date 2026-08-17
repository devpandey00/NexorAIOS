import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const whatsappTool: Tool = {
  id: 'whatsapp', name: 'WhatsApp', description: 'Create and operate WhatsApp outreach through Nexor approval workflows.', category: 'communication',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const base = String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const response = await fetch(`${base}/api/whatsapp/automation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { success: true, data } : { success: false, error: data?.error ?? data?.message ?? `WhatsApp automation failed (${response.status})` };
  },
};
