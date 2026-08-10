import { analyzerService } from '../services/analyzer.service.js';
import { outreachPrompt } from '../prompts/outreach.prompt.js';

export class OutreachAgent {
  async execute(business: unknown, sales: unknown) {
    const prompt = outreachPrompt(
      JSON.stringify(business, null, 2),
      JSON.stringify(sales, null, 2),
    );

    return analyzerService.analyze({
      prompt,
    });
  }
}

export const outreachAgent = new OutreachAgent();
