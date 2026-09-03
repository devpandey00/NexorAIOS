import type { ToolInput } from '../types/tool.js';
import type { ToolOutput } from '../types/tool.js';
import { toolRegistry } from '../registry/tool-registry.js';
import type { WorkflowResult } from '../runtime/workflow-runner.js';

interface ProspectResult { lead: Record<string, unknown>; research: ToolOutput; score: ToolOutput; crm: ToolOutput; outreach?: ToolOutput; }
function firstString(value: unknown): string | undefined { if (!Array.isArray(value)) return undefined; return value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)?.trim(); }
function researchPayload(output: ToolOutput): Record<string, unknown> { const data = (output.data ?? {}) as Record<string, unknown>; const result = (data.result ?? {}) as Record<string, unknown>; return (result.research ?? {}) as Record<string, unknown>; }

const NON_BUSINESS_PATTERNS = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\barticle\b/i, /\bnews\b/i];
const NON_BUSINESS_PATH = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;
const DEFAULT_MARKETS = ['USA', 'Australia', 'Canada', 'UAE'];
function isOperationalBusinessLead(lead: Record<string, unknown>) {
  const name = typeof lead.name === 'string' ? lead.name : typeof lead.businessName === 'string' ? lead.businessName : '';
  if (!name || NON_BUSINESS_PATTERNS.some((pattern) => pattern.test(name))) return false;
  if (typeof lead.website === 'string') {
    try { if (NON_BUSINESS_PATH.test(new URL(lead.website).pathname)) return false; } catch { return false; }
  }
  return true;
}

export async function runSalesMachineWorkflow(input: ToolInput): Promise<WorkflowResult> {
  const requestedMarkets = Array.isArray(input.markets)
    ? input.markets.filter((market): market is string => typeof market === 'string' && market.trim().length > 0).map((market) => market.trim())
    : [];
  const markets = requestedMarkets.length ? [...new Set(requestedMarkets)] : DEFAULT_MARKETS;
  const baseQuery = String(input.query ?? input.command ?? 'high-intent digital marketing prospects').trim();
  const requestedLimit = typeof input.limit === 'number' ? Math.max(1, Math.min(50, Math.floor(input.limit))) : 25;
  const perMarketLimit = Math.max(1, Math.ceil(requestedLimit / markets.length));

  const discoveries: ToolOutput[] = [];
  const discoveredAll: Record<string, unknown>[] = [];
  for (const market of markets) {
    const discovery = await toolRegistry.execute('lead_discovery', {
      query: `${baseQuery} in ${market}`,
      limit: perMarketLimit,
    });
    discoveries.push(discovery);
    if (!discovery.success) continue;
    const discovered = Array.isArray((discovery.data as Record<string, unknown> | undefined)?.leads)
      ? ((discovery.data as Record<string, unknown>).leads as Record<string, unknown>[])
      : [];
    for (const lead of discovered) discoveredAll.push({ ...lead, country: market, targetMarket: market });
  }

  if (!discoveredAll.length && discoveries.every((item) => !item.success)) {
    return { success: false, results: { discover: { success: false, data: { markets, providers: discoveries }, error: 'No international discovery provider returned usable leads.' } }, failedStep: 'discover' };
  }

  const operational = discoveredAll.filter(isOperationalBusinessLead);
  const dedup = await toolRegistry.execute('lead_dedup', { leads: operational });
  if (!dedup.success) return { success: false, results: { discover: { success: true, data: { markets, providers: discoveries } }, dedup }, failedStep: 'dedup' };
  const unique = Array.isArray((dedup.data as Record<string, unknown> | undefined)?.unique) ? ((dedup.data as Record<string, unknown>).unique as Record<string, unknown>[]) : [];

  const processLead = async (lead: Record<string, unknown>, index: number): Promise<{ prospect?: ProspectResult; error?: Record<string, string> }> => {
    try {
      const website = typeof lead.website === 'string' ? lead.website : '';
      const research: ToolOutput = website ? await toolRegistry.execute('website', { url: website }) : { success: true, data: { result: { research: {} } }, executionTime: 0 };
      const researchData = research.success ? researchPayload(research) : {};
      const contacts = (researchData.contacts ?? {}) as Record<string, unknown>;
      const email = typeof lead.email === 'string' && lead.email.trim() ? lead.email.trim() : firstString(contacts.emails);
      const phone = typeof lead.phone === 'string' && lead.phone.trim() ? lead.phone.trim() : firstString(contacts.phones);
      const enrichedLead = { ...lead, ...(email ? { email } : {}), ...(phone ? { whatsapp: phone } : {}) };

      const score = await toolRegistry.execute('lead_scoring', { lead: enrichedLead, research: researchData, businessFit: input.businessFit, growthSignals: input.growthSignals });
      if (!score.success) return { error: { lead: String(lead.name ?? index + 1), error: score.error ?? 'Scoring failed' } };
      const scoreData = (score.data ?? {}) as Record<string, unknown>;
      const services = Array.isArray(scoreData.recommendedServices) ? scoreData.recommendedServices.join(', ') : 'digital marketing';
      const rationale = typeof scoreData.rationale === 'string' ? scoreData.rationale : '';
      const businessName = typeof lead.businessName === 'string' ? lead.businessName : typeof lead.name === 'string' ? lead.name : `Prospect ${index + 1}`;
      const targetMarket = typeof lead.targetMarket === 'string' ? lead.targetMarket : typeof input.country === 'string' ? input.country : 'INTERNATIONAL';
      const crmLead = {
        ...enrichedLead,
        businessName,
        niche: typeof lead.niche === 'string' ? lead.niche : String(input.niche ?? 'digital marketing prospect'),
        country: targetMarket,
        notes: JSON.stringify({
          metadata: { source: 'sales-machine', leadType: 'BUSINESS', discoveredFrom: String(input.query ?? input.command ?? ''), targetMarket },
          research: researchData,
          score: scoreData,
          verifiedOpportunity: rationale,
          recommendedServices: services,
        }),
      };
      const crm = await toolRegistry.execute('crm', { action: 'create', lead: crmLead });
      if (!crm.success) return { error: { lead: String(lead.name ?? index + 1), error: crm.error ?? 'CRM persistence failed' } };
      const crmData = (crm.data ?? {}) as Record<string, unknown>; const persistedLead = (crmData.lead ?? crmData) as Record<string, unknown>; const leadId = typeof persistedLead.id === 'string' ? persistedLead.id : '';
      let outreach: ToolOutput | undefined;
      if (leadId && input.createDrafts !== false) {
        const channel = input.channel === 'EMAIL' ? 'EMAIL' : input.channel === 'WHATSAPP' ? 'WHATSAPP' : email ? 'EMAIL' : phone ? 'WHATSAPP' : '';
        if (channel) outreach = await toolRegistry.execute('outreach_draft', { leadId, channel, context: `International target market: ${targetMarket}. Verified research: ${JSON.stringify(researchData)}. Verified scoring: ${JSON.stringify(scoreData)}. Recommended services: ${services}. Use only these findings; create a unique message for ${businessName}.` });
      }
      return { prospect: { lead: enrichedLead, research, score, crm, outreach } };
    } catch (error) { return { error: { lead: String(lead.name ?? index + 1), error: error instanceof Error ? error.message : String(error) } }; }
  };

  const prospects: ProspectResult[] = []; const errors: Record<string, string>[] = [];
  for (let start = 0; start < unique.length; start += 4) {
    const batch = unique.slice(start, start + 4);
    const results = await Promise.all(batch.map((lead, offset) => processLead(lead, start + offset)));
    for (const result of results) { if (result.prospect) prospects.push(result.prospect); if (result.error) errors.push(result.error); }
  }

  const success = prospects.length > 0 || unique.length === 0;
  return {
    success,
    results: {
      discover: { success: discoveries.some((item) => item.success), data: { markets, providers: discoveries, totalDiscovered: discoveredAll.length }, executionTime: 0 },
      dedup,
      filteredOut: { success: true, data: { count: discoveredAll.length - operational.length }, executionTime: 0 },
      prospects: { success: true, data: { total: prospects.length, items: prospects, errors }, executionTime: 0 },
    },
    ...(success ? {} : { failedStep: 'prospects' }),
  };
}
