import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { leadService } from '@nexor/core';

function normalizedLead(input: Record<string, unknown>) {
  const businessName = typeof input.businessName === 'string' ? input.businessName.trim() : '';
  return {
    businessName,
    ...(typeof input.ownerName === 'string' && input.ownerName.trim() ? { ownerName: input.ownerName.trim() } : {}),
    niche: typeof input.niche === 'string' && input.niche.trim() ? input.niche.trim().slice(0, 100) : 'digital marketing prospect',
    country: typeof input.country === 'string' && input.country.trim() ? input.country.trim().slice(0, 100) : 'INTERNATIONAL',
    ...(typeof input.website === 'string' && input.website.trim() ? { website: input.website.trim() } : {}),
    ...(typeof input.email === 'string' && input.email.trim() ? { email: input.email.trim() } : {}),
    ...(typeof input.whatsapp === 'string' && input.whatsapp.trim() ? { whatsapp: input.whatsapp.trim() } : {}),
    ...(typeof input.linkedin === 'string' && input.linkedin.trim() ? { linkedin: input.linkedin.trim() } : {}),
    ...(typeof input.instagram === 'string' && input.instagram.trim() ? { instagram: input.instagram.trim() } : {}),
    ...(Number.isInteger(input.auditScore) ? { auditScore: Number(input.auditScore) } : {}),
    ...(typeof input.notes === 'string' ? { notes: input.notes.slice(0, 10000) } : {}),
  };
}

export const crmTool: Tool = {
  id: 'crm', name: 'CRM', description: 'Read and create leads directly through the Nexor CRM service.', category: 'crm',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const action = String(input.action ?? 'list');
    try {
      if (action === 'create') {
        const lead = normalizedLead((input.lead ?? input) as Record<string, unknown>);
        if (lead.businessName.length < 2) return { success: false, error: 'businessName is required' };
        const existing = await leadService.findAll({ search: lead.businessName, page: 1, pageSize: 5 });
        const exact = existing.data.find((item) => item.businessName.toLowerCase() === lead.businessName.toLowerCase());
        if (exact) return { success: true, data: { success: true, duplicate: true, lead: exact } };
        const created = await leadService.create(lead);
        return { success: true, data: { success: true, duplicate: false, lead: created } };
      }
      const result = await leadService.findAll({ page: 1, pageSize: 100 });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `CRM execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
