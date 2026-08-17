import { z } from 'zod';
import { analyzerService } from './analyzer.service.js';

const routeSchema = z.object({
  workflow: z.enum(['lead_generation', 'lead_to_outreach', 'social_content', 'opportunity_discovery', 'crm', 'research', 'website_audit', 'whatsapp', 'email', 'proposal']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type CommandRoute = z.infer<typeof routeSchema>;

const FALLBACKS: Array<[RegExp, CommandRoute['workflow']]> = [
  [/whatsapp|wa|message|follow.?up/i, 'whatsapp'],
  [/email|mail|outreach/i, 'email'],
  [/lead|prospect|business|client|find .*compan/i, 'lead_generation'],
  [/social|instagram|facebook|linkedin|post|caption|content|reel/i, 'social_content'],
  [/job|hiring|influencer|opportunit/i, 'opportunity_discovery'],
  [/website|audit|seo/i, 'website_audit'],
  [/research|competitor|analyse|analy[sz]e/i, 'research'],
  [/proposal|quotation|quote/i, 'proposal'],
  [/crm|pipeline|deal|contact/i, 'crm'],
];

function fallback(command: string): CommandRoute {
  const match = FALLBACKS.find(([pattern]) => pattern.test(command));
  return {
    workflow: match?.[1] ?? 'research',
    confidence: match ? 0.72 : 0.35,
    reason: match ? 'Matched the command to a supported Nexor workflow.' : 'No exact intent match; routed to research for safe inspection.',
    input: { command },
  };
}

export class CommandRouterService {
  async route(command: string, context: Record<string, unknown> = {}): Promise<CommandRoute> {
    const text = command.trim();
    if (!text) return fallback('');

    try {
      return await analyzerService.analyze<CommandRoute>({
        prompt: `You are NexorAIOS command router. Choose exactly one workflow from: lead_generation, lead_to_outreach, social_content, opportunity_discovery, crm, research, website_audit, whatsapp, email, proposal. Convert the user's command into structured input. Do not claim an action happened; only route it. Return JSON only. User command: ${text}\nContext: ${JSON.stringify(context)}`,
        schema: routeSchema,
      });
    } catch {
      return fallback(text);
    }
  }
}

export const commandRouterService = new CommandRouterService();
