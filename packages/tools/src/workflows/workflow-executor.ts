import type { ToolInput } from '../types/tool.js';
import type { WorkflowResult } from '../runtime/workflow-runner.js';
import { runWorkflow } from '../runtime/workflow-runner.js';
import { runLeadToOutreachWorkflow } from './lead-to-outreach.workflow.js';
import { runOpportunityDiscoveryWorkflow } from './opportunity-discovery.workflow.js';
import { runSocialContentWorkflow } from './social-content.workflow.js';
import { runSalesMachineWorkflow } from './sales-machine.workflow.js';

export type SupportedWorkflow =
  | 'lead_generation'
  | 'lead_to_outreach'
  | 'sales_machine'
  | 'social_content'
  | 'opportunity_discovery'
  | 'crm'
  | 'research'
  | 'website_audit'
  | 'whatsapp'
  | 'email'
  | 'proposal';

export async function executeWorkflow(
  workflow: SupportedWorkflow,
  input: ToolInput = {},
): Promise<WorkflowResult> {
  switch (workflow) {
    case 'lead_to_outreach':
      return runLeadToOutreachWorkflow(input);
    case 'sales_machine':
      return runSalesMachineWorkflow(input);
    case 'social_content':
      return runSocialContentWorkflow(input);
    case 'opportunity_discovery':
      return runOpportunityDiscoveryWorkflow(input);
    case 'lead_generation':
      return runWorkflow([{ id: 'discover', tool: 'search' }], input);
    case 'research':
      return runWorkflow([{ id: 'research', tool: 'search' }], input);
    case 'website_audit':
      return runWorkflow([{ id: 'website', tool: 'website' }], input);
    case 'crm':
      return runWorkflow([{ id: 'crm', tool: 'crm' }], input);
    case 'whatsapp':
      return runWorkflow([{ id: 'whatsapp', tool: 'whatsapp' }], input);
    case 'email':
      return runWorkflow([{ id: 'email', tool: 'email' }], input);
    case 'proposal':
      return runWorkflow([{ id: 'proposal', tool: 'proposal' }], input);
    default:
      return { success: false, results: {}, failedStep: workflow };
  }
}
