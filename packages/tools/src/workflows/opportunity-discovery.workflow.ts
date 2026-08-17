import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runOpportunityDiscoveryWorkflow(input: ToolInput): Promise<WorkflowResult> {
  const target = String(input.type ?? 'jobs companies influencers');
  return runWorkflow([
    {
      id: 'discover',
      tool: 'search',
      input: { query: `${target} ${String(input.location ?? '')} ${String(input.keywords ?? input.command ?? '')}`.trim() },
    },
    {
      id: 'research',
      tool: 'website',
      input: ({ results }) => {
        const data = results.discover?.data as { url?: string; website?: string } | undefined;
        return data?.url || data?.website ? { url: data.url ?? data.website } : {};
      },
      optional: true,
    },
  ], input);
}
