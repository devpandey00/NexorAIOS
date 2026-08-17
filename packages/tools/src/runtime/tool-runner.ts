import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export interface ToolRunOptions {
  timeoutMs?: number;
}

export async function runTool(
  tool: Tool,
  input: ToolInput = {},
  options: ToolRunOptions = {},
): Promise<ToolOutput> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 30_000;

  try {
    const result = await Promise.race([
      tool.execute(input),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error(`Tool timed out after ${timeoutMs}ms`)), timeoutMs);
        timer.unref?.();
      }),
    ]);

    return { ...result, executionTime: Date.now() - startedAt };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startedAt,
    };
  }
}
