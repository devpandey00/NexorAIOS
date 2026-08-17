import type { ToolInput } from '../types/tool.js';
import { runLeadToOutreachWorkflow } from '../workflows/lead-to-outreach.workflow.js';
import { toolRegistry } from '../registry/tool-registry.js';
import { registerDefaultTools } from '../registry/default-tools.js';
import { runWorkflow, type WorkflowResult } from './workflow-runner.js';

export type SupportedWorkflow =
  | 'lead_generation'
  | 'lead_to_outreach'
  | 'social_content'
  | 'opportunity_discovery'
  | 'crm'
  | 'research'
  | 'website_audit'
  | 'whatsapp'
  | 'email'
  | 'proposal';

export async function executeWorkflow(workflow: SupportedWorkflow, input: ToolInput = {}): Promise<WorkflowResult> {
  registerDefaultTools();

  switch (workflow) {
    case 'lead_to_outreach':
      return runLeadToOutreachWorkflow(input);
    case 'lead_generation':
      return runWorkflow([{ id: 'discover', tool: 'search', input }], input);
    case 'research':
      return runWorkflow([{ id: 'research', tool: 'search', input }], input);
    case 'website_audit':
      return runWorkflow([{ id: 'audit', tool: 'website', input }], input);
    case 'crm':
      return runWorkflow([{ id: 'crm', tool: 'crm', input }], input);
    case 'whatsapp':
      return runWorkflow([{ id: 'whatsapp', tool: 'whatsapp', input }], input);
    case 'email':
      return runWorkflow([{ id: 'email', tool: 'email', input }], input);
    case 'proposal':
      return runWorkflow([{ id: 'proposal', tool: 'proposal', input }], input);
    case 'social_content':
      return { success: false, results: {}, failedStep: 'social_content_not_implemented' };
    case 'opportunity_discovery':
      return { success: false, results: {}, failedStep: 'opportunity_discovery_not_implemented' };
  }
}
