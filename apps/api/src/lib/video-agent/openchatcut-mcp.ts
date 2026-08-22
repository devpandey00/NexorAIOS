type JsonRpcResponse = {
  result?: {
    structuredContent?: unknown;
    content?: Array<{ type?: string; text?: string }>;
    isError?: boolean;
  };
  error?: { message?: string };
};

export type OpenChatCutToolResult = Record<string, unknown> | unknown[] | string | null;
const DEFAULT_MCP_URL = 'http://127.0.0.1:5199/api/external-mcp/mcp';

function mcpUrl(): string { return process.env.OPENCHATCUT_MCP_URL?.trim() || DEFAULT_MCP_URL; }
function authHeaders(): Record<string, string> {
  const token = process.env.OPENCHATCUT_MCP_TOKEN?.trim();
  if (!token) throw new Error('OPENCHATCUT_MCP_TOKEN is required.');
  return { Authorization: `Bearer ${token}` };
}
function parseEventStream(text: string): JsonRpcResponse | null {
  const data = text.split(/\r?\n/).filter((row) => row.startsWith('data:')).map((row) => row.slice(5).trim()).filter(Boolean).pop();
  if (!data) return null;
  try { return JSON.parse(data) as JsonRpcResponse; } catch { return null; }
}
function extractResult(response: JsonRpcResponse): OpenChatCutToolResult {
  if (response.error) throw new Error(response.error.message || 'OpenChatCut MCP request failed');
  const result = response.result;
  if (!result) throw new Error('OpenChatCut MCP returned an empty response');
  if (result.isError) {
    const text = result.content?.find((item) => item.type === 'text')?.text;
    throw new Error(text || 'OpenChatCut tool call failed');
  }
  if (result.structuredContent !== undefined) return result.structuredContent as OpenChatCutToolResult;
  const text = result.content?.find((item) => item.type === 'text')?.text;
  if (text) { try { return JSON.parse(text) as OpenChatCutToolResult; } catch { return text; } }
  return null;
}

export class OpenChatCutMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;
  private initialized = false;

  async connect(): Promise<void> {
    if (this.initialized) return;
    extractResult(await this.request({
      jsonrpc: '2.0', id: this.nextId++, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'nexor-video-agent', version: '1.0.0' } },
    }, false));
    this.initialized = true;
    await this.request({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, true);
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<OpenChatCutToolResult> {
    await this.connect();
    return extractResult(await this.request({ jsonrpc: '2.0', id: this.nextId++, method: 'tools/call', params: { name, arguments: args } }, false));
  }

  async close(): Promise<void> {
    if (!this.sessionId) return;
    try { await fetch(mcpUrl(), { method: 'DELETE', headers: { ...authHeaders(), 'Mcp-Session-Id': this.sessionId }, cache: 'no-store' }); }
    catch { /* server-side session expiry is the fallback */ }
    finally { this.sessionId = null; this.initialized = false; }
  }

  private async request(payload: Record<string, unknown>, allowNoSession: boolean): Promise<JsonRpcResponse> {
    const headers: Record<string, string> = {
      ...authHeaders(), Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18',
    };
    if (this.sessionId && !allowNoSession) headers['Mcp-Session-Id'] = this.sessionId;
    const response = await fetch(mcpUrl(), { method: 'POST', headers, body: JSON.stringify(payload), cache: 'no-store' });
    if (!response.ok) throw new Error(`OpenChatCut MCP HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    const returnedSession = response.headers.get('mcp-session-id');
    if (returnedSession) this.sessionId = returnedSession;
    if (response.status === 202 || payload.method === 'notifications/initialized') return { result: {} };
    const text = await response.text();
    const parsed = response.headers.get('content-type')?.includes('text/event-stream')
      ? parseEventStream(text)
      : (() => { try { return JSON.parse(text) as JsonRpcResponse; } catch { return null; } })();
    if (!parsed) throw new Error('OpenChatCut MCP returned an unreadable response');
    return parsed;
  }
}

export async function withOpenChatCut<T>(fn: (client: OpenChatCutMcpClient) => Promise<T>): Promise<T> {
  const client = new OpenChatCutMcpClient();
  try { return await fn(client); } finally { await client.close(); }
}
