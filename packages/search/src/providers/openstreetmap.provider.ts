import type { Lead } from '../types/lead.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 8000;

interface NominatimResult {
  name?: string;
  display_name?: string;
  type?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
}

function addressFromResult(result: NominatimResult): string | undefined {
  if (result.display_name) return result.display_name;
  const address = result.address;
  if (!address) return undefined;
  return Object.values(address).filter(Boolean).join(', ') || undefined;
}

export async function openStreetMapSearch(query: string): Promise<Lead[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', normalized);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('extratags', '1');
  url.searchParams.set('limit', '30');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'NexorAIOS/1.0 lead-discovery (+https://nexoraios-main-1.vercel.app)',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`OpenStreetMap search failed (${response.status})`);
    const data = (await response.json()) as NominatimResult[];

    const seen = new Set<string>();
    return data
      .map((result) => {
        const name = result.name?.trim() || '';
        const tags = result.extratags ?? {};
        return {
          name,
          website: tags.website || tags['contact:website'] || '',
          phone: tags.phone || tags['contact:phone'],
          address: addressFromResult(result),
        } satisfies Lead;
      })
      .filter((lead) => {
        if (!lead.name || seen.has(lead.name.toLowerCase())) return false;
        seen.add(lead.name.toLowerCase());
        return true;
      });
  } finally {
    clearTimeout(timer);
  }
}
