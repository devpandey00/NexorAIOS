import OpenAI from 'openai';

let client: OpenAI | undefined;

/**
 * Lazily creates the OpenAI client on first use so builds and module
 * evaluation do not require OPENAI_API_KEY to be present.
 */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    client = new OpenAI({ apiKey });
  }

  return client;
}
