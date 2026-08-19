import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_ATTEMPTS = 2;

export const whatsappTool: Tool = {
  id: 'whatsapp', name: 'WhatsApp', description: 'Create and operate WhatsApp outreach through Nexor approval workflows.', category: 'communication',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const base = String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${base}/api/whatsapp/automation`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (response.ok) return { success: true, data };
        lastError = new Error(data?.error ?? data?.message ?? `WhatsApp automation failed (${response.status})`);
      } catch (error) { lastError = error; }
      finally { clearTimeout(timeout); }
      if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
    return { success: false, error: lastError instanceof Error ? lastError.message : String(lastError) };
  },
};
