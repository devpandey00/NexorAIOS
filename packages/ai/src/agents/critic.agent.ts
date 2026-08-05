import { analyzerService } from '../services/analyzer.service.js';
import { criticPrompt } from '../prompts/critic.prompt.js';

export class CriticAgent {
  async execute(originalPrompt: string, aiResponse: string) {
    const prompt = criticPrompt(originalPrompt, aiResponse);

    return analyzerService.analyze(prompt);
  }
}

export const criticAgent = new CriticAgent();
