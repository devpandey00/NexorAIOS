import { performance } from 'node:perf_hooks';

import { toolRegistry } from '../registry/tool-registry.js';
import type { ToolInput, ToolOutput } from '../types/tool.js';

export class ToolExecutor {
  async execute(toolId: string, input: ToolInput): Promise<ToolOutput> {
    const start = performance.now();

    try {
      const tool = toolRegistry.get(toolId);

      const result = await tool.execute(input);

      return {
        ...result,
        executionTime: performance.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown tool error',
        executionTime: performance.now() - start,
      };
    }
  }
}

export const toolExecutor = new ToolExecutor();
