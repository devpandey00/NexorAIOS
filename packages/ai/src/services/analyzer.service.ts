import { openai } from './openai.service.js';

export class AnalyzerService {
  async analyze(prompt: string) {
    const response = await openai.responses.create({
      model: 'gpt-5',
      input: prompt,
    });

    return response.output_text;
  }
}

export const analyzerService = new AnalyzerService();
