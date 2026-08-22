import { GoogleGenerativeAI } from '@google/generative-ai';

let client: GoogleGenerativeAI | undefined;

function getClient() {
  if (!client) {
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export async function geminiAnalyze(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({
    model: process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash',
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
