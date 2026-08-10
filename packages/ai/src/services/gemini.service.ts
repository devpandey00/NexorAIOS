import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env['GEMINI_API_KEY'];

if (!apiKey) {
  throw new Error('GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(apiKey);

export async function geminiAnalyze(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(prompt);

  const output = result.response.text().trim();

  if (!output) {
    throw new Error('Gemini returned an empty response.');
  }

  return output;
}
