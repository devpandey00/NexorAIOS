import { researchAgent } from '../agents/research.agent.js';
import { businessAgent } from '../agents/business.agent.js';
import { salesAgent } from '../agents/sales.agent.js';
import { pricingAgent } from '../agents/pricing.agent.js';
import { proposalAgent } from '../agents/proposal.agent.js';
import { outreachAgent } from '../agents/outreach.agent.js';
import { criticAgent } from '../agents/critic.agent.js';

export class OrchestratorService {
  async execute(researchData: unknown) {
    const research = await researchAgent.execute(researchData);

    const business = await businessAgent.execute(research);

    const sales = await salesAgent.execute(business);

    const pricing = await pricingAgent.execute(business, sales);

    const proposal = await proposalAgent.execute(business, sales);

    const outreach = await outreachAgent.execute(business, sales);

    const review = await criticAgent.execute(
      'Complete AI Pipeline',
      JSON.stringify({
        research,
        business,
        sales,
        pricing,
        proposal,
        outreach,
      }),
    );

    return {
      research,
      business,
      sales,
      pricing,
      proposal,
      outreach,
      review,
    };
  }
}

export const orchestratorService = new OrchestratorService();
