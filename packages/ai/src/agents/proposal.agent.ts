import { analyzerService } from '../services/analyzer.service.js';
import { proposalPrompt } from '../prompts/proposal.prompt.js';

export class ProposalAgent {
  async execute(business: unknown, sales: unknown) {
    const prompt = proposalPrompt(
      JSON.stringify(business, null, 2),
      JSON.stringify(sales, null, 2),
    );

    return analyzerService.analyze(prompt);
  }
}

export const proposalAgent = new ProposalAgent();
