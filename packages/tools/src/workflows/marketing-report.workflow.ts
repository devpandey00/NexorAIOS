import type { ToolInput } from '../types/tool.js';
import { runWorkflow, type WorkflowResult } from '../runtime/workflow-runner.js';

export async function runMarketingReportWorkflow(input: ToolInput): Promise<WorkflowResult> {
  return runWorkflow([
    {
      id: 'crm',
      tool: 'crm',
      input: { action: 'summary', ...(input.crm as Record<string, unknown> | undefined) },
      optional: true,
    },
    {
      id: 'report',
      tool: 'proposal',
      input: ({ input, results }) => ({
        action: 'create',
        title: String(input.title ?? 'Nexor Marketing Report'),
        context: {
          period: input.period ?? 'current period',
          metrics: results.crm?.data ?? null,
          campaign: input.campaign ?? null,
        },
      }),
    },
    {
      id: 'email',
      tool: 'email',
      input: ({ input, results }) => ({
        action: 'draft',
        to: input.to ?? input.email,
        subject: String(input.subject ?? 'Nexor Marketing Report'),
        body: results.report?.data ?? results.report,
      }),
      optional: true,
    },
  ], input);
}
