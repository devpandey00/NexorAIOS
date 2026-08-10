import pRetry from 'p-retry';
import { z } from 'zod';
import { geminiAnalyze } from './gemini.service.js';

export interface AnalyzeOptions<T = unknown> {
  prompt: string;
  schema?: z.ZodSchema;
  model?: string;
  temperature?: number;
}

export class AnalyzerService {
  async analyze<T = string>({
    prompt,
    schema,
    model = 'gemini-2.5-flash',
  }: AnalyzeOptions): Promise<T> {
    const started = Date.now();

    const result = await pRetry(
      async () => {
        const output = await geminiAnalyze(prompt);

        if (!schema) {
          return output as T;
        }

        let parsed: unknown;

        try {
          parsed = JSON.parse(output);
        } catch {
          throw new Error('AI returned invalid JSON.');
        }

        return schema.parse(parsed) as T;
      },
      {
        retries: 2,
      },
    );

    console.log(`[AI] ${model} completed in ${Date.now() - started}ms`);

    return result;
  }
}

export const analyzerService = new AnalyzerService();
