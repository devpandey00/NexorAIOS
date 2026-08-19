import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const base = () => String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

type ApiData = { message?: string; error?: string } & Record<string, unknown>;

export const crmTool: Tool = {
  id: 'crm', name: 'CRM', description: 'Read and create leads through the Nexor CRM API.', category: 'crm',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const action = String(input.action ?? 'list');
    const response = await fetch(`${base()}/api/leads`, {
      method: action === 'create' ? 'POST' : 'GET',
      headers: action === 'create' ? { 'content-type': 'application/json' } : undefined,
      body: action === 'create' ? JSON.stringify(input.lead ?? input) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as ApiData;
    return response.ok ? { success: true, data } : { success: false, error: data.message ?? data.error ?? `CRM request failed (${response.status})` };
  },
};
