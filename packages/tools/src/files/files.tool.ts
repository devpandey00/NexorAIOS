import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const filesTool: Tool = {
  id: 'files',
  name: 'Files',
  description: 'Create, inspect and transform text/markdown artifacts for Nexor workflows.',
  category: 'files',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const action = String(input.action ?? 'create');
    if (action !== 'create') return { success: false, error: `Unsupported files action: ${action}` };
    const name = String(input.name ?? 'nexor-output.md').trim();
    const content = String(input.content ?? '');
    if (!content) return { success: false, error: 'content is required' };
    return {
      success: true,
      data: {
        name: name.replace(/[^a-zA-Z0-9._-]/g, '-'),
        mimeType: 'text/markdown',
        content,
        bytes: Buffer.byteLength(content, 'utf8'),
      },
    };
  },
};
