import { personalizationAgent } from '../agents/personalization.agent.js';

/**
 * Outreach generation is intentionally one AI pass per lead.
 *
 * The old implementation ran research -> BI -> personalization as three
 * sequential model calls for every lead. With retry enabled in AnalyzerService,
 * a 10-lead generation could trigger dozens of model calls and make the UI
 * appear frozen. The sales pipeline already supplies verified research,
 * scoring and lead metadata, so the personalization pass can use that context
 * directly and produce the channel-specific drafts.
 */
export class OutreachService {
  async generate(data: unknown) {
    return personalizationAgent.execute(data);
  }
}

export const outreachService = new OutreachService();
