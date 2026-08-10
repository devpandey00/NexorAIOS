import { analyzerService } from '../services/analyzer.service.js';
import { businessPrompt } from '../prompts/business.prompt.js';

export class BusinessAgent {
  async execute(researchData: unknown) {
    const prompt = businessPrompt(JSON.stringify(researchData, null, 2));

    return analyzerService.analyze({
      prompt,
    });
  }
}

export const businessAgent = new BusinessAgent();
