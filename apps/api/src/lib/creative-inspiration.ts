export type InspirationResult = {
  source: 'PINTEREST' | 'MANUAL_FALLBACK';
  id?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  pinUrl?: string;
};

export function isPinterestConfigured() {
  return Boolean(process.env.PINTEREST_ACCESS_TOKEN?.trim());
}

export async function searchPinterestInspiration(query: string, limit = 12): Promise<InspirationResult[]> {
  const q = query.trim();
  if (!q) throw new Error('query is required');
  const token = process.env.PINTEREST_ACCESS_TOKEN?.trim();
  if (!token) return [];
  const version = process.env.PINTEREST_API_VERSION?.trim() || 'v5';
  const url = new URL(`https://api.pinterest.com/${version}/search/pins`);
  url.searchParams.set('query', q);
  url.searchParams.set('page_size', String(Math.min(Math.max(limit, 1), 25)));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Pinterest search failed (${response.status})`);
  return Array.isArray(body?.items) ? body.items.map((pin: any) => ({
    source: 'PINTEREST' as const,
    id: typeof pin?.id === 'string' ? pin.id : undefined,
    title: pin?.title || 'Pinterest inspiration',
    description: pin?.description || undefined,
    imageUrl: pin?.media?.images?.orig?.url || pin?.media?.images?.['600x']?.url || undefined,
    pinUrl: pin?.pin_url || undefined,
  })) : [];
}

export function getCreativeProviderStatus() {
  return {
    pinterest: isPinterestConfigured() ? 'CONFIGURED' : 'NOT_CONFIGURED',
    canva: process.env.CANVA_ACCESS_TOKEN?.trim() ? 'CONFIGURED' : 'NOT_CONFIGURED',
    rule: 'Pinterest is inspiration/research only; generated creatives must be original and provider credentials are required for automated publishing/export.',
  } as const;
}
