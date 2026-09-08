import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { researchService } from '@nexor/research';

export const websiteTool: Tool = {
  id: 'website', name: 'Website Analyzer', description: 'Run Nexor website research directly inside the server runtime.', category: 'research',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const url = typeof input.url === 'string' ? input.url.trim() : '';
    if (!url) return { success: false, error: 'url is required' };
    try {
      const research = await researchService.analyze(url);
      return research.success
        ? { success: true, data: { result: { research } } }
        : { success: false, data: { result: { research } }, error: 'Website research returned no usable result' };
    } catch (error) {
      return { success: false, error: `Website analysis failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
