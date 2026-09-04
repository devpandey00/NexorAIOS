import type { Lead } from '../types/lead.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const TIMEOUT_MS = 10000;
interface NominatimResult { name?: string; display_name?: string; lat?: string; lon?: string; address?: Record<string, string>; extratags?: Record<string, string>; }
interface OverpassElement { id: number; tags?: Record<string, string>; }

const KNOWN_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  dubai: { lat: 25.2048, lon: 55.2708 }, 'abu dhabi': { lat: 24.4539, lon: 54.3773 }, sharjah: { lat: 25.3463, lon: 55.4209 },
  london: { lat: 51.5074, lon: -0.1278 }, 'new york': { lat: 40.7128, lon: -74.006 }, 'los angeles': { lat: 34.0522, lon: -118.2437 },
  toronto: { lat: 43.6532, lon: -79.3832 }, sydney: { lat: -33.8688, lon: 151.2093 }, melbourne: { lat: -37.8136, lon: 144.9631 },
  vancouver: { lat: 49.2827, lon: -123.1207 }, lucknow: { lat: 26.8467, lon: 80.9462 }, delhi: { lat: 28.6139, lon: 77.209 },
  mumbai: { lat: 19.076, lon: 72.8777 }, bangalore: { lat: 12.9716, lon: 77.5946 }, singapore: { lat: 1.3521, lon: 103.8198 },
};

function addressFromResult(result: NominatimResult): string | undefined { return result.display_name || (result.address ? Object.values(result.address).filter(Boolean).join(', ') || undefined : undefined); }
function nameFromResult(result: NominatimResult): string { return result.name?.trim() || result.extratags?.name?.trim() || result.display_name?.split(',')[0]?.trim() || ''; }
function dedupe(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => { const key = `${lead.name}|${lead.website ?? ''}|${lead.phone ?? ''}|${lead.address ?? ''}`.toLowerCase().replace(/\/$/, ''); if (!lead.name || seen.has(key)) return false; seen.add(key); return true; });
}

function queryVariants(query: string): string[] {
  const original = query.trim();
  const cleaned = original.replace(/\b(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|websites?|social media|digital marketing|services?|lead generation|conversion optimization|needs?|need|more|qualified|high[- ]intent|generate|generating|official|contact|company|business|businesses|looking for|with weak online presence|agency prospects|phone|companies)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  const variants = [original, cleaned, cleaned.replace(/\s+in\s+/gi, ' ')];
  if (/\bdentists?\b/i.test(original) && /\bdubai\b/i.test(original)) variants.push('dentists Dubai', 'dentist Dubai', 'dental clinic Dubai', 'dental clinics Dubai');
  return [...new Set(variants.filter(Boolean))];
}

function categoryFilters(query: string): string[] {
  const q = query.toLowerCase();
  if (/dentist|dental/.test(q)) return ['["amenity"="dentist"]', '["healthcare"="dentist"]', '["healthcare:speciality"="dentistry"]'];
  if (/doctor|clinic|hospital|medical/.test(q)) return ['["amenity"="clinic"]', '["amenity"="doctors"]', '["amenity"="hospital"]', '["healthcare"]'];
  if (/restaurant|cafe|coffee|bakery/.test(q)) return ['["amenity"="restaurant"]', '["amenity"="cafe"]', '["shop"="bakery"]'];
  if (/hotel|resort/.test(q)) return ['["tourism"="hotel"]', '["tourism"="resort"]', '["tourism"="guest_house"]'];
  if (/salon|barber|beauty/.test(q)) return ['["shop"="hairdresser"]', '["shop"="beauty"]'];
  if (/gym|fitness/.test(q)) return ['["leisure"="fitness_centre"]', '["leisure"="sports_centre"]'];
  if (/lawyer|law firm|legal/.test(q)) return ['["office"="lawyer"]'];
  if (/accountant|accounting/.test(q)) return ['["office"="accountant"]'];
  if (/real estate|realtor|property/.test(q)) return ['["office"="estate_agent"]'];
  return ['["office"]', '["shop"]', '["amenity"]', '["craft"]'];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, headers: { accept: 'application/json', 'user-agent': 'NexorAIOS/1.0 lead-discovery', ...(init?.headers ?? {}) }, cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function nominatimSearch(variant: string): Promise<Lead[]> {
  const url = new URL(NOMINATIM_URL); url.searchParams.set('q', variant); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('addressdetails', '1'); url.searchParams.set('extratags', '1'); url.searchParams.set('limit', '50');
  const data = await fetchJson<NominatimResult[]>(url.toString());
  return dedupe((data ?? []).map((result) => { const tags = result.extratags ?? {}; return { name: nameFromResult(result), website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: addressFromResult(result) } satisfies Lead; }));
}

function locationCandidates(query: string): string[] {
  const candidates: string[] = [];
  const q = query.replace(/\s+/g, ' ').trim();
  const inMatch = q.match(/\bin\s+(.+?)(?=\s+(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|social media|needs?|need|more|qualified|official|contact|looking for|with weak|agency prospects)\b|$)/i);
  if (inMatch?.[1]) candidates.push(inMatch[1].trim());
  for (const city of Object.keys(KNOWN_LOCATIONS)) if (new RegExp(`\\b${city.replace(' ', '\\s+')}\\b`, 'i').test(q)) candidates.push(city);
  return [...new Set(candidates.filter(Boolean))];
}

async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  for (const location of locationCandidates(query)) {
    const known = KNOWN_LOCATIONS[location.toLowerCase()]; if (known) return known;
    const url = new URL(NOMINATIM_URL); url.searchParams.set('q', location); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1');
    const data = await fetchJson<NominatimResult[]>(url.toString()); const lat = Number(data?.[0]?.lat); const lon = Number(data?.[0]?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  }
  return null;
}

async function overpassSearch(query: string): Promise<Lead[]> {
  const point = await geocodeLocation(query); if (!point) return [];
  const filters = categoryFilters(query);
  const radius = /\b(?:dubai|abu dhabi|sharjah|london|new york|toronto|sydney|melbourne|singapore)\b/i.test(query) ? 30000 : 18000;
  const queries = filters.map((filter) => `[out:json][timeout:9];(nwr${filter}(around:${radius},${point.lat},${point.lon}););out center tags;`);
  const responses = await Promise.all(OVERPASS_URLS.flatMap((endpoint) => queries.map((body) => fetchJson<{ elements?: OverpassElement[] }>(endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(body)}` }))));
  const leads = responses.flatMap((response) => (response?.elements ?? []).map((element) => { const tags = element.tags ?? {}; const name = String(tags.name ?? tags['name:en'] ?? '').trim(); const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', '); return { name, website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: address || undefined } satisfies Lead; }));
  return dedupe(leads).slice(0, 150);
}

export async function openStreetMapSearch(query: string): Promise<Lead[]> {
  const normalized = query.trim(); if (!normalized) return [];
  const category = categoryFilters(normalized)[0];
  if (category !== '["office"]') {
    const [overpass, ...nominatim] = await Promise.all([overpassSearch(normalized), ...queryVariants(normalized).slice(0, 5).map(nominatimSearch)]);
    const merged = dedupe([...overpass, ...nominatim.flat()]);
    if (merged.length) return merged.slice(0, 150);
  }
  return dedupe((await Promise.all(queryVariants(normalized).slice(0, 5).map(nominatimSearch))).flat()).slice(0, 150);
}
