import type { Lead } from '../types/lead.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const TIMEOUT_MS = 9000;
interface NominatimResult { name?: string; display_name?: string; lat?: string; lon?: string; address?: Record<string, string>; extratags?: Record<string, string>; }
interface OverpassElement { id: number; tags?: Record<string, string>; }

function addressFromResult(result: NominatimResult): string | undefined { return result.display_name || (result.address ? Object.values(result.address).filter(Boolean).join(', ') || undefined : undefined); }
function nameFromResult(result: NominatimResult): string { return result.name?.trim() || result.extratags?.name?.trim() || result.display_name?.split(',')[0]?.trim() || ''; }
const STOP = /\b(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|websites?|social media|digital marketing|services?|lead generation|conversion optimization|needs?|need|more|qualified|high[- ]intent|generate|generating|official|contact|company|business|businesses|looking for|with weak online presence|agency prospects|phone|companies)\b/gi;

function queryVariants(query: string): string[] {
  const original = query.trim();
  const cleaned = original.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
  const withoutIn = cleaned.replace(/\s+in\s+/gi, ' ').trim();
  const variants = [original, cleaned, withoutIn];
  if (/\bdentists?\b/i.test(original) && /\bdubai\b/i.test(original)) variants.push('dentists Dubai', 'dentist Dubai', 'dental clinic Dubai', 'dental clinics Dubai');
  return [...new Set(variants.filter(Boolean))];
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
  try { const response = await fetch(url, { ...init, headers: { accept: 'application/json', 'user-agent': 'NexorAIOS/1.0 lead-discovery (+https://nexoraios-main-1.vercel.app)', ...(init?.headers ?? {}) }, cache: 'no-store', signal: controller.signal }); if (!response.ok) return null; return await response.json() as T; } catch { return null; } finally { clearTimeout(timer); }
}
async function nominatimSearch(variant: string): Promise<Lead[]> {
  const url = new URL(NOMINATIM_URL); url.searchParams.set('q', variant); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('addressdetails', '1'); url.searchParams.set('extratags', '1'); url.searchParams.set('limit', '30');
  const data = await fetchJson<NominatimResult[]>(url.toString()); const seen = new Set<string>();
  return (data ?? []).map((result) => { const tags = result.extratags ?? {}; return { name: nameFromResult(result), website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: addressFromResult(result) } satisfies Lead; }).filter((lead) => { const key = `${lead.name}|${lead.address ?? ''}`.toLowerCase(); if (!lead.name || seen.has(key)) return false; seen.add(key); return true; });
}
function locationCandidates(query: string): string[] {
  const candidates: string[] = [];
  const inMatch = query.match(/\bin\s+(.+?)(?=\s+(?:google|meta|facebook|instagram|linkedin|tiktok|youtube|ads?|marketing|seo|website|social media|needs?|need|more|qualified|high[- ]intent|official|contact|looking for|with weak|agency prospects)\b|$)/i);
  if (inMatch?.[1]) candidates.push(inMatch[1].trim());
  const common = ['Dubai','Abu Dhabi','Sharjah','London','New York','Los Angeles','Toronto','Sydney','Melbourne','Vancouver','Lucknow','Delhi','Mumbai','Bangalore','Singapore'];
  for (const city of common) if (new RegExp(`\\b${city.replace(' ', '\\s+')}\\b`, 'i').test(query)) candidates.push(city);
  const cleaned = query.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length > 1) candidates.push(parts.slice(1).join(' '));
  return [...new Set(candidates.filter(Boolean))];
}
async function geocodeLocation(query: string): Promise<{ lat: number; lon: number } | null> {
  for (const location of locationCandidates(query)) { const url = new URL(NOMINATIM_URL); url.searchParams.set('q', location); url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '1'); const data = await fetchJson<NominatimResult[]>(url.toString()); const lat = Number(data?.[0]?.lat); const lon = Number(data?.[0]?.lon); if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }; }
  return null;
}
async function overpassSearch(query: string): Promise<Lead[]> {
  const point = await geocodeLocation(query); if (!point) return [];
  const blocks = categoryFilters(query).map((filter) => `nwr${filter}(around:30000,${point.lat},${point.lon});`);
  const body = `[out:json][timeout:20];(${blocks.join('')});out center tags;`;
  const response = await fetchJson<{ elements?: OverpassElement[] }>(OVERPASS_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(body)}` });
  const seen = new Set<string>();
  return (response?.elements ?? []).map((element) => { const tags = element.tags ?? {}; const name = String(tags.name ?? tags['name:en'] ?? '').trim(); const address = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'], tags['addr:postcode']].filter(Boolean).join(', '); return { name, website: tags.website || tags['contact:website'] || '', phone: tags.phone || tags['contact:phone'], address: address || undefined } satisfies Lead; }).filter((lead) => { const key = lead.name.toLowerCase(); if (!lead.name || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 40);
}
export async function openStreetMapSearch(query: string): Promise<Lead[]> { const normalized = query.trim(); if (!normalized) return []; for (const variant of queryVariants(normalized)) { const leads = await nominatimSearch(variant); if (leads.length) return leads; } return overpassSearch(normalized); }
