import { researchAgent } from '../agents/research.agent.js';
import { businessIntelligenceAgent } from '../agents/business-intelligence.agent.js';
import { personalizationAgent } from '../agents/personalization.agent.js';

export class OutreachService {
  async generate(data: unknown) {
    const research = await researchAgent.execute(data);

    const business = await businessIntelligenceAgent.execute(research);

    return personalizationAgent.execute(business);
  }
}

export const outreachService = new OutreachService();
