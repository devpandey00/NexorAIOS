import OpenAI from 'openai';

let client: OpenAI | null = null;

/**
 * Creates the OpenAI client only when an AI operation actually runs.
 * This prevents Next.js/Vercel build-time module evaluation from failing
 * when OPENAI_API_KEY is intentionally unavailable in the build environment.
 */
export function getOpenAI(): OpenAI {
  if (client) return client;

  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Backwards-compatible lazy facade for existing internal consumers.
 * Accessing any OpenAI client property initializes the client at runtime.
 */
export const openai = new Proxy({} as OpenAI, {
  get(_target, property, receiver) {
    const value = Reflect.get(getOpenAI() as object, property, receiver);
    return typeof value === 'function' ? value.bind(getOpenAI()) : value;
  },
});
