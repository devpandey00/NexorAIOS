import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

type ApiData = { error?: string; message?: string } & Record<string, unknown>;

export const outreachDraftTool: Tool = {
  id: 'outreach_draft',
  name: 'Outreach Draft',
  description: 'Create a personalized WhatsApp or email draft and place it in the approval queue.',
  category: 'communication',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const leadId = typeof input.leadId === 'string' ? input.leadId : '';
    const channel = input.channel === 'EMAIL' ? 'EMAIL' : input.channel === 'WHATSAPP' ? 'WHATSAPP' : '';
    if (!leadId || !channel) return { success: false, error: 'leadId and channel are required' };
    const configured = process.env.NEXOR_API_URL?.trim();
    const port = process.env.PORT?.trim() || '3000';
    const base = (configured || `http://localhost:${port}`).replace(/\/$/, '');
    try {
      const response = await fetch(`${base}/api/outreach/drafts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId, channel, context: typeof input.context === 'string' ? input.context : '' }),
      });
      const data = (await response.json().catch(() => ({}))) as ApiData;
      return response.ok ? { success: true, data } : { success: false, error: data.error ?? data.message ?? `Draft creation failed (${response.status})` };
    } catch (error) {
      return { success: false, error: `Outreach connection failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
