import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { leadService } from '@nexor/core';

export const crmTool: Tool = {
  id: 'crm', name: 'CRM', description: 'Read and create leads directly through the Nexor CRM service.', category: 'crm',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const action = String(input.action ?? 'list');
    try {
      if (action === 'create') {
        const lead = (input.lead ?? input) as Record<string, unknown>;
        const businessName = typeof lead.businessName === 'string' ? lead.businessName.trim() : '';
        if (!businessName) return { success: false, error: 'businessName is required' };
        const existing = await leadService.findAll({ search: businessName, page: 1, pageSize: 5 });
        const exact = existing.data.find((item) => item.businessName.toLowerCase() === businessName.toLowerCase());
        if (exact) return { success: true, data: { success: true, duplicate: true, lead: exact } };
        const created = await leadService.create(lead as never);
        return { success: true, data: { success: true, duplicate: false, lead: created } };
      }
      const result = await leadService.findAll({ page: 1, pageSize: 100 });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `CRM execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
