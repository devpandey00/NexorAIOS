import { analyzerService } from '../services/analyzer.service.js';
import { researchPrompt } from '../prompts/research.prompt.js';

export class ResearchAgent {
  async execute(researchData: unknown) {
    const prompt = researchPrompt(JSON.stringify(researchData, null, 2));

    return analyzerService.analyze(prompt);
  }
}

export const researchAgent = new ResearchAgent();
