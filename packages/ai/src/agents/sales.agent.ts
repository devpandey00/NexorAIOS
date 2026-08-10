import { analyzerService } from '../services/analyzer.service.js';
import { salesPrompt } from '../prompts/sales.prompt.js';

export class SalesAgent {
  async execute(businessAnalysis: unknown) {
    const prompt = salesPrompt(JSON.stringify(businessAnalysis, null, 2));

    return analyzerService.analyze({
      prompt,
    });
  }
}

export const salesAgent = new SalesAgent();
