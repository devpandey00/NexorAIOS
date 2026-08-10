const OLLAMA_URL = process.env['OLLAMA_URL'] ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'] ?? 'qwen3:8b';

export async function ollamaAnalyze(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { response?: string };

  if (!data.response) {
    throw new Error('Ollama returned an empty response.');
  }

  return data.response.trim();
}
