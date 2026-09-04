import type { Lead } from '../types/lead.js';

const SERPER_URL = 'https://google.serper.dev/search';

interface SerperResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface SerperResponse {
  organic?: SerperResult[];
}

function googleRegion(query: string): string {
  const q = query.toLowerCase();
  if (/\b(dubai|abu dhabi|uae|united arab emirates)\b/.test(q)) return 'ae';
  if (/\b(london|uk|united kingdom|england)\b/.test(q)) return 'gb';
  if (/\b(toronto|canada)\b/.test(q)) return 'ca';
  if (/\b(sydney|melbourne|australia)\b/.test(q)) return 'au';
  if (/\b(singapore)\b/.test(q)) return 'sg';
  if (/\b(new york|los angeles|miami|chicago|houston|dallas|usa|united states)\b/.test(q)) return 'us';
  if (/\b(delhi|mumbai|bangalore|bengaluru|lucknow|india)\b/.test(q)) return 'in';
  return 'us';
}

export async function serperSearch(query: string): Promise<Lead[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const normalizedQuery = query.trim();
  const response = await fetch(SERPER_URL, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: normalizedQuery, gl: googleRegion(normalizedQuery), hl: 'en', num: 30 }),
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Serper search failed (${response.status}): ${text}`);

  const data = JSON.parse(text) as SerperResponse;
  const seen = new Set<string>();

  return (data.organic ?? [])
    .map((item) => {
      const website = item.link?.trim() ?? '';
      if (!website) return null;
      try {
        const url = new URL(website);
        const domain = url.hostname.replace(/^www\./, '').toLowerCase();
        if (!domain || seen.has(domain)) return null;
        if (/^(facebook|instagram|linkedin|youtube|google|bing|yelp|yellowpages|tripadvisor|wikipedia)\./i.test(domain)) return null;
        if (/\/(jobs?|careers?|vacancies|blog|article|news|directory|listing)(\/|$)/i.test(url.pathname)) return null;
        if (/\b(best|top|list|directory|guide|roundup|jobs?|careers?|vacanc(?:y|ies)|salary|apply now)\b/i.test(item.title ?? '')) return null;
        seen.add(domain);
        const name = item.title?.replace(/\s*[|·–—-].*$/, '').trim() || domain.split('.')[0];
        return { name, website: url.toString() };
      } catch {
        return null;
      }
    })
    .filter((lead): lead is Lead => Boolean(lead));
}
