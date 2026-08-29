import axios from 'axios';

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  // No response at all = network/timeout/DNS failure — worth one retry.
  if (!error.response) return true;
  // 5xx is often transient. 4xx is not — retrying a 404/403 just burns time.
  return error.response.status >= 500;
}

export async function fetchHtml(url: string): Promise<string> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data } = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 NexorOS Research Bot',
        },
      });
      return data;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }

  throw lastError;
}
