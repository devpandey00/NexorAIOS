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

function nameFromResult(result: NominatimResult): string {
  const explicit = result.name?.trim();
  if (explicit) return explicit;
  const tagged = result.extratags?.name?.trim();
  if (tagged) return tagged;
  return result.display_name?.split(',')[0]?.trim() || '';
}

function queryVariants(query: string): string[] {
  const original = query.trim();
  const cleaned = original
    .replace(/\b(?:needs?|need|more|qualified|high[- ]intent|generate|generating)\s+leads?\b/gi, ' ')
    .replace(/\b(?:official|contact|company|business|businesses|looking for|with weak online presence|agency prospects)\b/gi, ' ')
    .replace(/\b(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|websites?|social media|digital marketing|services?|lead generation|conversion optimization)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalized = cleaned.replace(/\s+in\s+/gi, ' ').replace(/\s+/g, ' ').trim();
  const variants = [original, cleaned, normalized];

  if (/\bdentists?\b/i.test(original)) {
    variants.push('dentists Dubai', 'dentist Dubai', 'dental clinic Dubai', 'dental clinics Dubai');
  }

  return Array.from(new Set(variants.map((value) => value.trim()).filter(Boolean)));
}

export async function openStreetMapSearch(query: string): Promise<Lead[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  for (const variant of queryVariants(normalized)) {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', variant);
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

      if (!response.ok) continue;
      const data = (await response.json()) as NominatimResult[];
      const seen = new Set<string>();
      const leads = data
        .map((result) => {
          const name = nameFromResult(result);
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
      if (leads.length) return leads;
    } finally {
      clearTimeout(timer);
    }
  }
  return [];
}
