import type { Lead } from '../types/lead.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 9000;

interface NominatimResult { name?: string; display_name?: string; lat?: string; lon?: string; address?: Record<string, string>; extratags?: Record<string, string>; }
interface OverpassElement { id: number; tags?: Record<string, string>; }

function addressFromResult(result: NominatimResult): string | undefined {
  if (result.display_name) return result.display_name;
  const address = result.address;
  return address ? Object.values(address).filter(Boolean).join(', ') || undefined : undefined;
}
function nameFromResult(result: NominatimResult): string {
  return result.name?.trim() || result.extratags?.name?.trim() || result.display_name?.split(',')[0]?.trim() || '';
}
function queryVariants(query: string): string[] {
  const original = query.trim();
  const cleaned = original
    .replace(/\b(?:needs?|need|more|qualified|high[- ]intent|generate|generating)\s+leads?\b/gi, ' ')
    .replace(/\b(?:official|contact|company|business|businesses|looking for|with weak online presence|agency prospects)\b/gi, ' ')
    .replace(/\b(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|websites?|social media|digital marketing|services?|lead generation|conversion optimization)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const normalized = cleaned.replace(/\s+in\s+/gi, ' ').replace(/\s+/g, ' ').trim();
  const variants = [original, cleaned, normalized];
  if (/\bdentists?\b/i.test(original)) variants.push('dentists Dubai', 'dentist Dubai', 'dental clinic Dubai', 'dental clinics Dubai');
  return Array.from(new Set(variants.map(v => v.trim()).filter(Boolean)));
}
function categoryFilters(query: string): string[] {
  const q = query.toLowerCase();
  if (/dentist|dental/.test(q)) return ['["amenity"="dentist"]', '["healthcare"="dentist"]'];
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
    const response = await fetch(url, { ...init, headers: { accept: 'application/json', 'user-agent': 'NexorAIOS/1.0 lead-discovery (+https://nexoraios-main-1.vercel.app)', ...(init?.headers ?? {}) }, cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch { return null; } finally { clearTimeout(timer); }
}
async function nominatimSearch(variant: string): Promise<Lead[]> {
  const url = new URL(NOMINATIM_URL); url.searchParams.set('q', variant); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('addressdetails', '1'); url.searchParams.set('extratags', '1'); url.searchParams.set('limit', '30');
  const data = await fetchJson<NominatimResult[]>(url.toString());
  const seen = new Set<string>();
  return (data ?? []).map(result => { const tags = result.extratags ?? {}; return { name: nameFromResult(result), website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: addressFromResult(result) } satisfies Lead; }).filter(lead => { const key = `${lead.name}|${lead.address ?? ''}`.toLowerCase(); if (!lead.name || seen.has(key)) return false; seen.add(key); return true; });
}
async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  const location = query.match(/\bin\s+(.+)$/i)?.[1]?.trim() || query.trim();
  const url = new URL(NOMINATIM_URL); url.searchParams.set('q', location); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1');
  const data = await fetchJson<NominatimResult[]>(url.toString()); const lat = Number(data?.[0]?.lat); const lon = Number(data?.[0]?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}
async function overpassSearch(query: string): Promise<Lead[]> {
  const point = await geocodeLocation(query); if (!point) return [];
  const filters = categoryFilters(query); const blocks = filters.map(filter => `nwr${filter}(around:30000,${point.lat},${point.lon});`);
  const body = `[out:json][timeout:20];(${blocks.join('')});out center tags;`;
  const response = await fetchJson<{ elements?: OverpassElement[] }>(OVERPASS_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(body)}` });
  const seen = new Set<string>();
  return (response?.elements ?? []).map(element => { const tags = element.tags ?? {}; const name = String(tags.name ?? tags['name:en'] ?? '').trim(); const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', '); return { name, website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: address || undefined } satisfies Lead; }).filter(lead => { const key = lead.name.toLowerCase(); if (!lead.name || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 40);
}
export async function openStreetMapSearch(query: string): Promise<Lead[]> {
  const normalized = query.trim(); if (!normalized) return [];
  for (const variant of queryVariants(normalized)) { const leads = await nominatimSearch(variant); if (leads.length) return leads; }
  return overpassSearch(normalized);
}
