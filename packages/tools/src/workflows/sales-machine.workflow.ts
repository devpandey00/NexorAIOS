import type { ToolInput } from '../types/tool.js';
import type { ToolOutput } from '../types/tool.js';
import { toolRegistry } from '../registry/tool-registry.js';
import type { WorkflowResult } from '../runtime/workflow-runner.js';

interface ProspectResult {
  lead: Record<string, unknown>;
  research: ToolOutput;
  score: ToolOutput;
  crm: ToolOutput;
  outreach?: ToolOutput;
}

export async function runSalesMachineWorkflow(input: ToolInput): Promise<WorkflowResult> {
  const discovery = await toolRegistry.execute('lead_discovery', {
    query: String(input.query ?? input.command ?? 'qualified digital marketing prospects'),
    limit: typeof input.limit === 'number' ? input.limit : 25,
  });

  if (!discovery.success) {
    return { success: false, results: { discover: discovery }, failedStep: 'discover' };
  }

  const discovered = Array.isArray((discovery.data as Record<string, unknown> | undefined)?.leads)
    ? ((discovery.data as Record<string, unknown>).leads as Record<string, unknown>[])
    : [];

  const dedup = await toolRegistry.execute('lead_dedup', { leads: discovered });
  if (!dedup.success) {
    return { success: false, results: { discover: discovery, dedup }, failedStep: 'dedup' };
  }

  const unique = Array.isArray((dedup.data as Record<string, unknown> | undefined)?.unique)
    ? ((dedup.data as Record<string, unknown>).unique as Record<string, unknown>[])
    : [];

  const prospects: ProspectResult[] = [];
  const errors: Record<string, string>[] = [];

  for (const [index, lead] of unique.entries()) {
    const website = typeof lead.website === 'string' ? lead.website : '';
    const research = website
      ? await toolRegistry.execute('website', { url: website })
      : { success: true, data: {} };

    const score = await toolRegistry.execute('lead_scoring', {
      lead,
      research: research.data ?? {},
      businessFit: input.businessFit,
      growthSignals: input.growthSignals,
    });

    if (!score.success) {
      errors.push({ lead: String(lead.name ?? index + 1), error: score.error ?? 'Scoring failed' });
      continue;
    }

    const scoreData = (score.data ?? {}) as Record<string, unknown>;
    const crmLead = {
      ...lead,
      businessName: typeof lead.businessName === 'string' ? lead.businessName : typeof lead.name === 'string' ? lead.name : undefined,
      niche: typeof lead.niche === 'string' ? lead.niche : String(input.niche ?? 'digital marketing prospect'),
      country: typeof lead.country === 'string' ? lead.country : String(input.country ?? 'India'),
      source: 'sales-machine',
      auditScore: typeof scoreData.score === 'number' ? scoreData.score : undefined,
      notes: JSON.stringify({ research: research.data ?? {}, score: scoreData }),
    };

    const crm = await toolRegistry.execute('crm', { action: 'create', lead: crmLead });
    if (!crm.success) {
      errors.push({ lead: String(lead.name ?? index + 1), error: crm.error ?? 'CRM persistence failed' });
      continue;
    }

    const crmData = (crm.data ?? {}) as Record<string, unknown>;
    const persistedLead = (crmData.lead ?? crmData) as Record<string, unknown>;
    const leadId = typeof input.leadId === 'string' ? input.leadId : typeof persistedLead.id === 'string' ? persistedLead.id : '';

    let outreach: ToolOutput | undefined;
    if (leadId && input.createDrafts !== false) {
      const services = Array.isArray(scoreData.recommendedServices)
        ? scoreData.recommendedServices.join(', ')
        : 'digital marketing';
      outreach = await toolRegistry.execute('outreach_draft', {
        leadId,
        channel: input.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP',
        context: `We identified ${services} as the strongest initial opportunity for this business.`,
      });
    }

    prospects.push({ lead, research, score, crm, outreach });
  }

  const success = prospects.length > 0 || unique.length === 0;
  return {
    success,
    results: {
      discover: discovery,
      dedup,
      prospects: { success: true, data: { total: prospects.length, items: prospects, errors } },
    },
    ...(success ? {} : { failedStep: 'prospects' }),
  };
}
