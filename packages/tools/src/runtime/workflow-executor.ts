import type { ToolInput } from '../types/tool.js';
import { runLeadToOutreachWorkflow } from '../workflows/lead-to-outreach.workflow.js';
import { runSocialContentWorkflow } from '../workflows/social-content.workflow.js';
import { runOpportunityDiscoveryWorkflow } from '../workflows/opportunity-discovery.workflow.js';
import { runSalesMachineWorkflow } from '../workflows/sales-machine.workflow.js';
import { registerDefaultTools } from '../registry/default-tools.js';
import { runWorkflow, type WorkflowResult } from './workflow-runner.js';

export type SupportedWorkflow =
  | 'lead_generation'
  | 'sales_machine'
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
    case 'lead_generation': return runWorkflow([{ id: 'discover', tool: 'search', input }], input);
    case 'sales_machine': return runSalesMachineWorkflow(input);
    case 'lead_to_outreach': return runLeadToOutreachWorkflow(input);
    case 'social_content': return runSocialContentWorkflow(input);
    case 'opportunity_discovery': return runOpportunityDiscoveryWorkflow(input);
    case 'research': return runWorkflow([{ id: 'research', tool: 'search', input }], input);
    case 'website_audit': return runWorkflow([{ id: 'audit', tool: 'website', input }], input);
    case 'crm': return runWorkflow([{ id: 'crm', tool: 'crm', input }], input);
    case 'whatsapp': return runWorkflow([{ id: 'whatsapp', tool: 'whatsapp', input }], input);
    case 'email': return runWorkflow([{ id: 'email', tool: 'email', input }], input);
    case 'proposal': return runWorkflow([{ id: 'proposal', tool: 'proposal', input }], input);
  }
}

export function isSupportedWorkflow(value: string): value is SupportedWorkflow {
  return ['lead_generation','sales_machine','lead_to_outreach','social_content','opportunity_discovery','crm','research','website_audit','whatsapp','email','proposal'].includes(value);
}
