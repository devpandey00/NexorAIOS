import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runSalesMachineWorkflow(input: ToolInput): Promise<WorkflowResult> {
  return runWorkflow([
    {
      id: 'discover',
      tool: 'search',
      input: { query: String(input.query ?? input.command ?? 'qualified digital marketing prospects') },
    },
    {
      id: 'dedup',
      tool: 'lead_dedup',
      input: ({ results }) => ({
        leads: Array.isArray(results.discover?.data?.leads)
          ? results.discover.data.leads
          : Array.isArray(results.discover?.data)
            ? results.discover.data
            : [],
      }),
    },
    {
      id: 'research',
      tool: 'website',
      input: ({ results }) => {
        const unique = results.dedup?.data?.unique as Record<string, unknown>[] | undefined;
        const first = unique?.[0];
        const url = typeof first?.website === 'string' ? first.website : '';
        return url ? { url } : {};
      },
      optional: true,
    },
    {
      id: 'score',
      tool: 'lead_scoring',
      input: ({ results }) => {
        const unique = results.dedup?.data?.unique as Record<string, unknown>[] | undefined;
        const lead = unique?.[0] ?? {};
        return { lead, research: results.research?.data ?? {} };
      },
    },
    {
      id: 'crm',
      tool: 'crm',
      input: ({ results, input }) => {
        const unique = results.dedup?.data?.unique as Record<string, unknown>[] | undefined;
        const lead = unique?.[0] ?? (input.lead as Record<string, unknown> | undefined) ?? {};
        const score = results.score?.data as Record<string, unknown> | undefined;
        return {
          action: 'create',
          lead: {
            ...lead,
            niche: typeof lead.niche === 'string' ? lead.niche : String(input.niche ?? 'digital marketing prospect'),
            country: typeof lead.country === 'string' ? lead.country : String(input.country ?? 'India'),
            source: 'sales-machine',
            auditScore: typeof score?.score === 'number' ? score.score : undefined,
            notes: JSON.stringify(score ?? {}),
          },
        };
      },
    },
    {
      id: 'outreach_draft',
      tool: 'outreach_draft',
      optional: true,
      input: ({ input, results }) => {
        const crmData = results.crm?.data as Record<string, unknown> | undefined;
        const lead = (crmData?.lead ?? crmData) as Record<string, unknown> | undefined;
        const leadId = typeof input.leadId === 'string' ? input.leadId : typeof lead?.id === 'string' ? lead.id : '';
        const score = results.score?.data as Record<string, unknown> | undefined;
        const services = Array.isArray(score?.recommendedServices) ? score.recommendedServices.join(', ') : 'digital marketing';
        return {
          leadId,
          channel: input.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP',
          context: `We identified ${services} as the strongest initial opportunity.`,
        };
      },
    },
  ], input);
}
