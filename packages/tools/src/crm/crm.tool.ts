import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const base = () => {
  const configured = process.env.NEXOR_API_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  return (configured || 'http://localhost:3000').replace(/\/$/, '');
};

type ApiData = { message?: string; error?: string } & Record<string, unknown>;

export const crmTool: Tool = {
  id: 'crm', name: 'CRM', description: 'Read and create leads through the Nexor CRM API.', category: 'crm',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const action = String(input.action ?? 'list');
    try {
      const response = await fetch(`${base()}/api/leads`, {
        method: action === 'create' ? 'POST' : 'GET',
        headers: action === 'create' ? { 'content-type': 'application/json' } : undefined,
        body: action === 'create' ? JSON.stringify(input.lead ?? input) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as ApiData;
      return response.ok ? { success: true, data } : { success: false, error: data.message ?? data.error ?? `CRM request failed (${response.status})` };
    } catch (error) {
      return { success: false, error: `CRM connection failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
