import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runLeadToOutreachWorkflow(input: ToolInput): Promise<WorkflowResult> {
  return runWorkflow(
    [
      { id: 'discover', tool: 'search', input },
      {
        id: 'research',
        tool: 'website',
        input: ({ results }) => {
          const data = results.discover.data as { url?: string; website?: string } | undefined;
          const url = data?.url ?? data?.website;
          return url ? { url } : {};
        },
        optional: true,
      },
      {
        id: 'crm',
        tool: 'crm',
        input: ({ input, results }) => ({ action: 'create', lead: { ...(input.lead as object ?? {}), research: results.research?.data ?? null } }),
      },
      {
        id: 'outreach',
        tool: 'whatsapp',
        input: ({ input, results }) => ({ action: 'draft', lead: input.lead, research: results.research?.data ?? null }),
        optional: true,
      },
    ],
    input,
  );
}
