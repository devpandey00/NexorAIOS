import { analyzerService } from '../services/analyzer.service.js';
import { pricingPrompt } from '../prompts/pricing.prompt.js';

export class PricingAgent {
  async execute(business: unknown, sales: unknown) {
    const prompt = pricingPrompt(JSON.stringify(business, null, 2), JSON.stringify(sales, null, 2));

    return analyzerService.analyze(prompt);
  }
}

export const pricingAgent = new PricingAgent();
