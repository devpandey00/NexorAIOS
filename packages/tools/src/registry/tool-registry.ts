import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { runTool, type ToolRunOptions } from '../runtime/tool-runner.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool) {
    if (this.tools.has(tool.id)) throw new Error(`Tool already registered: ${tool.id}`);
    this.tools.set(tool.id, tool);
  }

  get(id: string): Tool {
    const tool = this.tools.get(id);
    if (!tool) throw new Error(`Tool not found: ${id}`);
    return tool;
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  async execute(id: string, input: ToolInput = {}, options?: ToolRunOptions): Promise<ToolOutput> {
    return runTool(this.get(id), input, options);
  }
}

export const toolRegistry = new ToolRegistry();
