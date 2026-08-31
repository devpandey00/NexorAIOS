const OLLAMA_URL = process.env['OLLAMA_URL'] ?? 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'] ?? 'qwen3:8b';
const OLLAMA_TIMEOUT_MS = Number(process.env['OLLAMA_TIMEOUT_MS'] ?? '60000');

export async function ollamaAnalyze(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(OLLAMA_TIMEOUT_MS) && OLLAMA_TIMEOUT_MS > 0 ? OLLAMA_TIMEOUT_MS : 60000);
  try {
    const response = await fetch(`${OLLAMA_URL.replace(/\/$/, '')}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { response?: string };
    if (!data.response?.trim()) throw new Error('Ollama returned an empty response.');
    return data.response.trim();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Ollama timed out after ${OLLAMA_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
