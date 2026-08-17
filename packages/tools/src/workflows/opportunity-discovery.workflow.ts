import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runOpportunityDiscoveryWorkflow(input: ToolInput): Promise<WorkflowResult> {
  const query = String(input.query ?? input.command ?? 'digital marketing opportunities');
  return runWorkflow([
    { id: 'discover', tool: 'search', input: { query } },
    {
      id: 'research',
      tool: 'website',
      input: ({ results }) => {
        const data = results.discover?.data as Record<string, unknown> | undefined;
        const url = typeof data?.url === 'string' ? data.url : typeof data?.website === 'string' ? data.website : undefined;
        return url ? { url } : {};
      },
      optional: true,
    },
    {
      id: 'crm',
      tool: 'crm',
      input: ({ input, results }) => ({
        action: 'create',
        lead: {
          ...(input.lead as Record<string, unknown> | undefined),
          source: 'opportunity-discovery',
          discovery: results.discover?.data ?? null,
          research: results.research?.data ?? null,
        },
      }),
      optional: true,
    },
  ], input);
}
