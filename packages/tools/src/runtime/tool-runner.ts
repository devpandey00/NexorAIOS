import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export interface ToolRunOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

async function executeWithTimeout(tool: Tool, input: ToolInput, timeoutMs: number): Promise<ToolOutput> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      tool.execute(input),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Tool timed out after ${timeoutMs}ms`)), timeoutMs);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runTool(
  tool: Tool,
  input: ToolInput = {},
  options: ToolRunOptions = {},
): Promise<ToolOutput> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const retries = Math.max(0, Math.min(options.retries ?? 1, 3));
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await executeWithTimeout(tool, input, timeoutMs);
      if (result.success || attempt === retries) {
        return { ...result, executionTime: Date.now() - startedAt };
      }
      lastError = result.error ?? 'Tool execution failed';
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs * 2 ** attempt));
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError ?? 'Tool execution failed'),
    executionTime: Date.now() - startedAt,
  };
}
