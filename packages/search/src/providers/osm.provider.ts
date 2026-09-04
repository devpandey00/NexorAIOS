import type { Lead } from '../types/lead.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  type?: string;
  category?: string;
  lat?: string;
  lon?: string;
  extratags?: Record<string, string>;
};

function cleanQuery(query: string) {
  return query
    .replace(/\b(?:needs?|need|more|qualified|high[- ]intent|generate|generating)\s+leads?\b/gi, ' ')
    .replace(/\b(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|websites?|social media)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function osmSearch(query: string): Promise<Lead[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const variants = Array.from(new Set([normalized, cleanQuery(normalized)].filter(Boolean)));
  for (const variant of variants) {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', variant);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');
    url.searchParams.set('limit', '20');
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NexorAIOS/1.0 lead-discovery contact@nexoraios.com', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) continue;
    const results = (await response.json()) as NominatimResult[];
    const leads = results
      .filter((item) => Boolean(item.display_name))
      .map((item) => {
        const tags = item.extratags ?? {};
        const name = tags.name || item.display_name!.split(',')[0]?.trim() || '';
        const website = tags.website || tags['contact:website'] || (item.osm_type && item.osm_id ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}` : '');
        const phone = tags.phone || tags['contact:phone'];
        return { name, website, ...(phone ? { phone } : {}) };
      })
      .filter((lead) => lead.name.length >= 2);
    if (leads.length) return leads;
  }
  return [];
}
