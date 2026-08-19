import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 2;

async function requestWithRetry(url: string, input: ToolInput): Promise<ToolOutput> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return { success: true, data };
      lastError = new Error(data?.error ?? data?.message ?? `Website analysis failed (${response.status})`);
    } catch (error) { lastError = error; }
    finally { clearTimeout(timeout); }
    if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }
  return { success: false, error: lastError instanceof Error ? lastError.message : String(lastError) };
}

export const websiteTool: Tool = {
  id: 'website', name: 'Website Analyzer', description: 'Run website research with bounded timeout and retry handling.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) return { success: false, error: 'url is required' };
    const base = String(process.env.NEXOR_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    return requestWithRetry(`${base}/api/research`, { ...input, url });
  },
};
