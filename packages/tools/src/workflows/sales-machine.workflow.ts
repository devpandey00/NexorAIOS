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
      id: 'research',
      tool: 'website',
      input: ({ input, results }) => {
        const lead = input.lead as Record<string, unknown> | undefined;
        const discovered = results.discover?.data as Record<string, unknown> | undefined;
        const url = typeof lead?.website === 'string' ? lead.website : typeof discovered?.website === 'string' ? discovered.website : typeof discovered?.url === 'string' ? discovered.url : '';
        return url ? { url } : {};
      },
      optional: true,
    },
    {
      id: 'score',
      tool: 'lead_scoring',
      input: ({ input, results }) => ({
        lead: input.lead ?? results.discover?.data ?? {},
        research: results.research?.data ?? {},
      }),
    },
    {
      id: 'crm',
      tool: 'crm',
      input: ({ input, results }) => ({
        action: 'create',
        lead: {
          ...(input.lead as Record<string, unknown> | undefined),
          source: 'sales-machine',
          auditScore: (results.score?.data as Record<string, unknown> | undefined)?.score ?? null,
          notes: JSON.stringify(results.score?.data ?? {}),
        },
      }),
    },
  ], input);
}
