import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { leadSearchService } from '@nexor/search';

const NON_BUSINESS_PATTERNS = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\barticle\b/i, /\bnews\b/i];
const NON_BUSINESS_PATH = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;

function isOperationalBusinessLead(lead: { name: string; website: string }) {
  if (!lead.name.trim() || NON_BUSINESS_PATTERNS.some((pattern) => pattern.test(lead.name))) return false;
  try { return !NON_BUSINESS_PATH.test(new URL(lead.website).pathname); } catch { return false; }
}

export const leadDiscoveryTool: Tool = {
  id: 'lead_discovery',
  name: 'Lead Discovery',
  description: 'Find real prospect websites and contact data through the configured discovery provider.',
  category: 'sales',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const query = typeof input.query === 'string' ? input.query.trim() : String(input.command ?? '').trim();
    if (!query) return { success: false, error: 'query is required' };

    try {
      const limit = typeof input.limit === 'number' ? Math.max(1, Math.min(50, Math.floor(input.limit))) : 25;
      const result = await leadSearchService.search(query);
      const raw = result.leads.map((lead) => ({ name: lead.name, website: lead.website, phone: lead.phone, address: lead.address }));
      const filtered = raw.filter(isOperationalBusinessLead).slice(0, limit);
      const leads = filtered.map((lead) => ({
        name: lead.name,
        website: lead.website,
        ...(lead.phone ? { phone: lead.phone } : {}),
        ...(lead.address ? { address: lead.address } : {}),
      }));
      return { success: true, data: { query, count: leads.length, filteredOut: raw.length - filtered.length, leads } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
};
