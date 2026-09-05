/** Pinterest inspiration lookup via the official Pinterest API v5. */

export class PinterestNotConfiguredError extends Error {
  constructor() {
    super('Pinterest integration not configured: set PINTEREST_ACCESS_TOKEN (see .env.example)');
    this.name = 'PinterestNotConfiguredError';
  }
}

export interface PinterestPinResult {
  sourceUrl: string;
  title: string | null;
  dominantColor: string | null;
  mediaUrl: string | null;
}

function pinterestToken(): string {
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  if (!token) throw new PinterestNotConfiguredError();
  return token;
}

export async function searchPinterestInspiration(query: string, limit = 10): Promise<PinterestPinResult[]> {
  const token = pinterestToken();
  const trimmedQuery = query.trim();
  if (!trimmedQuery) throw new Error('Pinterest search query is required');
  const capped = Math.min(Math.max(limit, 1), 25);
  const response = await fetch(
    `https://api.pinterest.com/v5/search/pins?query=${encodeURIComponent(trimmedQuery)}&page_size=${capped}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message ?? `Pinterest API request failed (${response.status})`);
  const items = Array.isArray(json?.items) ? json.items : [];
  return items.map((item: Record<string, unknown>) => ({
    sourceUrl: typeof item.link === 'string' ? item.link : `https://www.pinterest.com/pin/${String(item.id ?? '')}/`,
    title: typeof item.title === 'string' ? item.title : typeof item.description === 'string' ? item.description : null,
    dominantColor: typeof item.dominant_color === 'string' ? item.dominant_color : null,
    mediaUrl: (((item.media as Record<string, unknown> | undefined)?.images as Record<string, { url?: string }> | undefined)?.['600x']?.url) ?? null,
  }));
}

export function isPinterestConfigured(): boolean {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN?.trim());
}
