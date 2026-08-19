import type { ToolInput } from '../types/tool.js';
import type { ToolOutput } from '../types/tool.js';
import { toolRegistry } from '../registry/tool-registry.js';
import type { WorkflowResult } from '../runtime/workflow-runner.js';

interface ProspectResult { lead: Record<string, unknown>; research: ToolOutput; score: ToolOutput; crm: ToolOutput; outreach?: ToolOutput; }
function firstString(value: unknown): string | undefined { if (!Array.isArray(value)) return undefined; return value.find((item): item is string => typeof item === 'string' && item.trim().length > 0)?.trim(); }
function researchPayload(output: ToolOutput): Record<string, unknown> {
  const data = (output.data ?? {}) as Record<string, unknown>;
  const result = (data.result ?? {}) as Record<string, unknown>;
  const research = (result.research ?? {}) as Record<string, unknown>;
  return research;
}

export async function runSalesMachineWorkflow(input: ToolInput): Promise<WorkflowResult> {
  const discovery = await toolRegistry.execute('lead_discovery', { query: String(input.query ?? input.command ?? 'qualified digital marketing prospects'), limit: typeof input.limit === 'number' ? input.limit : 25 });
  if (!discovery.success) return { success: false, results: { discover: discovery }, failedStep: 'discover' };
  const discovered = Array.isArray((discovery.data as Record<string, unknown> | undefined)?.leads) ? ((discovery.data as Record<string, unknown>).leads as Record<string, unknown>[]) : [];
  const dedup = await toolRegistry.execute('lead_dedup', { leads: discovered });
  if (!dedup.success) return { success: false, results: { discover: discovery, dedup }, failedStep: 'dedup' };
  const unique = Array.isArray((dedup.data as Record<string, unknown> | undefined)?.unique) ? ((dedup.data as Record<string, unknown>).unique as Record<string, unknown>[]) : [];
  const prospects: ProspectResult[] = []; const errors: Record<string, string>[] = [];

  for (const [index, lead] of unique.entries()) {
    try {
      const website = typeof lead.website === 'string' ? lead.website : '';
      const research = website ? await toolRegistry.execute('website', { url: website }) : { success: true, data: { result: { research: {} } } };
      const researchData = research.success ? researchPayload(research) : {};
      const contacts = (researchData.contacts ?? {}) as Record<string, unknown>;
      const email = typeof lead.email === 'string' && lead.email.trim() ? lead.email.trim() : firstString(contacts.emails);
      const phone = typeof lead.phone === 'string' && lead.phone.trim() ? lead.phone.trim() : firstString(contacts.phones);
      const enrichedLead = { ...lead, ...(email ? { email } : {}), ...(phone ? { whatsapp: phone } : {}) };

      const score = await toolRegistry.execute('lead_scoring', { lead: enrichedLead, research: researchData, businessFit: input.businessFit, growthSignals: input.growthSignals });
      if (!score.success) { errors.push({ lead: String(lead.name ?? index + 1), error: score.error ?? 'Scoring failed' }); continue; }
      const scoreData = (score.data ?? {}) as Record<string, unknown>;
      const services = Array.isArray(scoreData.recommendedServices) ? scoreData.recommendedServices.join(', ') : 'digital marketing';
      const rationale = typeof scoreData.rationale === 'string' ? scoreData.rationale : '';
      const crmLead = { ...enrichedLead, businessName: typeof lead.businessName === 'string' ? lead.businessName : typeof lead.name === 'string' ? lead.name : undefined, niche: typeof lead.niche === 'string' ? lead.niche : String(input.niche ?? 'digital marketing prospect'), country: typeof lead.country === 'string' ? lead.country : String(input.country ?? 'India'), source: 'sales-machine', auditScore: typeof scoreData.score === 'number' ? scoreData.score : undefined, notes: JSON.stringify({ research: researchData, score: scoreData }) };
      const crm = await toolRegistry.execute('crm', { action: 'create', lead: crmLead });
      if (!crm.success) { errors.push({ lead: String(lead.name ?? index + 1), error: crm.error ?? 'CRM persistence failed' }); continue; }
      const crmData = (crm.data ?? {}) as Record<string, unknown>; const persistedLead = (crmData.lead ?? crmData) as Record<string, unknown>; const leadId = typeof persistedLead.id === 'string' ? persistedLead.id : '';
      let outreach: ToolOutput | undefined;
      if (leadId && input.createDrafts !== false) {
        const channel = input.channel === 'EMAIL' ? 'EMAIL' : input.channel === 'WHATSAPP' ? 'WHATSAPP' : email ? 'EMAIL' : phone ? 'WHATSAPP' : '';
        if (channel) outreach = await toolRegistry.execute('outreach_draft', { leadId, channel, context: `Verified website research: ${rationale}. Recommended services: ${services}. Do not invent claims.` });
      }
      prospects.push({ lead: enrichedLead, research, score, crm, outreach });
    } catch (error) { errors.push({ lead: String(lead.name ?? index + 1), error: error instanceof Error ? error.message : String(error) }); }
  }

  const success = prospects.length > 0 || unique.length === 0;
  return { success, results: { discover: discovery, dedup, prospects: { success: true, data: { total: prospects.length, items: prospects, errors } } }, ...(success ? {} : { failedStep: 'prospects' }) };
}
