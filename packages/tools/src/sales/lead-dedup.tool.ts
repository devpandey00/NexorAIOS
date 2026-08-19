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

function normalizeContact(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase().replace(/[^a-z0-9@+]/g, '') : '';
}

function normalizeSocial(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`);
    return `${url.hostname.replace(/^www\./, '').toLowerCase()}${url.pathname.replace(/\/+$/, '').toLowerCase()}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export const leadDedupTool: Tool = {
  id: 'lead_dedup',
  name: 'Lead Deduplication',
  description: 'Normalize and deduplicate discovered prospects by business, domain, email, phone and social URLs before CRM persistence.',
  category: 'sales',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const raw = Array.isArray(input.leads) ? input.leads : [];
    const seen = new Set<string>();
    const unique: Record<string, unknown>[] = [];
    const duplicates: Record<string, unknown>[] = [];

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const lead = item as Record<string, unknown>;
      const keys = [
        normalizeDomain(lead.website), normalizeContact(lead.email),
        normalizeContact(lead.phone ?? lead.whatsapp), normalizeSocial(lead.instagram),
        normalizeSocial(lead.facebook), normalizeSocial(lead.linkedin), normalizeSocial(lead.youtube),
        normalizeSocial(lead.tiktok), normalizeSocial(lead.x ?? lead.twitter),
        normalizeBusiness(lead.businessName ?? lead.name),
      ].filter(Boolean);
      if (keys.length === 0) continue;
      if (keys.some((key) => seen.has(key))) { duplicates.push(lead); continue; }
      keys.forEach((key) => seen.add(key));
      unique.push({
        ...lead,
        businessName: typeof lead.businessName === 'string' ? lead.businessName.trim() : typeof lead.name === 'string' ? lead.name.trim() : undefined,
        website: typeof lead.website === 'string' ? lead.website.trim() : undefined,
        email: typeof lead.email === 'string' ? lead.email.trim() : undefined,
        whatsapp: typeof lead.whatsapp === 'string' ? lead.whatsapp.trim() : typeof lead.phone === 'string' ? lead.phone.trim() : undefined,
      });
    }

    return { success: true, data: { unique, duplicates, uniqueCount: unique.length, duplicateCount: duplicates.length } };
  },
};
