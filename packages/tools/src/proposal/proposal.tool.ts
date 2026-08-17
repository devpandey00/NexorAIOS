import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

export const proposalTool: Tool = {
  id: 'proposal',
  name: 'Proposal Generator',
  description: 'Generate a structured digital-marketing proposal from prospect and service inputs.',
  category: 'productivity',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const business = String(input.business ?? input.company ?? '').trim();
    const services = Array.isArray(input.services) ? input.services.map(String) : [];
    if (!business || services.length === 0) return { success: false, error: 'business and at least one service are required' };
    const budget = input.budget ? String(input.budget) : 'To be discussed';
    const timeline = input.timeline ? String(input.timeline) : '30 days';
    const content = [
      `# Digital Marketing Proposal — ${business}`,
      '',
      '## Objectives',
      '- Increase qualified traffic and enquiries',
      '- Build measurable acquisition funnels',
      '- Track leads, conversions and campaign performance',
      '',
      '## Recommended Services',
      ...services.map((service) => `- ${service}`),
      '',
      `## Timeline\n${timeline}`,
      '',
      `## Indicative Budget\n${budget}`,
      '',
      '## Reporting',
      'Weekly performance reporting with leads, spend, CPL/CPA, conversions and next actions.',
    ].join('\n');
    return { success: true, data: { business, services, budget, timeline, content } };
  },
};
