import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runSocialContentWorkflow(input: ToolInput): Promise<WorkflowResult> {
  return runWorkflow([
    {
      id: 'content_plan',
      tool: 'search',
      input: { query: `content strategy ${String(input.topic ?? input.command ?? 'digital marketing')}` },
    },
    {
      id: 'content_draft',
      tool: 'proposal',
      input: ({ input, results }) => ({
        action: 'create',
        title: `Social content: ${String(input.topic ?? 'Marketing')}`,
        context: results.content_plan?.data ?? input,
        platform: input.platform ?? 'instagram',
      }),
      optional: true,
    },
  ], input);
}
