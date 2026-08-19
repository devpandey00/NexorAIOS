import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

function normalizeBusiness(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ') : '';
}

function normalizeDomain(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export const leadDedupTool: Tool = {
  id: 'lead_dedup',
  name: 'Lead Deduplication',
  description: 'Normalize and deduplicate discovered prospects before CRM persistence.',
  category: 'sales',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const raw = Array.isArray(input.leads) ? input.leads : [];
    const seenDomains = new Set<string>();
    const seenBusinesses = new Set<string>();
    const unique: Record<string, unknown>[] = [];
    const duplicates: Record<string, unknown>[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const lead = item as Record<string, unknown>;
      const business = normalizeBusiness(lead.businessName ?? lead.name);
      const domain = normalizeDomain(lead.website);
      if (!business && !domain) continue;

      const duplicate = (domain && seenDomains.has(domain)) || (business && seenBusinesses.has(business));
      if (duplicate) {
        duplicates.push(lead);
        continue;
      }

      if (domain) seenDomains.add(domain);
      if (business) seenBusinesses.add(business);
      unique.push({
        ...lead,
        businessName: typeof lead.businessName === 'string' ? lead.businessName.trim() : typeof lead.name === 'string' ? lead.name.trim() : undefined,
        website: typeof lead.website === 'string' ? lead.website.trim() : undefined,
      });
    }

    return { success: true, data: { unique, duplicates, uniqueCount: unique.length, duplicateCount: duplicates.length } };
  },
};
