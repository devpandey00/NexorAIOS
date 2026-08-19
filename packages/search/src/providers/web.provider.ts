import { Lead } from '../types/lead.js';

const SEARCH_URL = 'https://html.duckduckgo.com/html/';
const REQUEST_TIMEOUT_MS = 8000;
const SITE_NAME_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;

interface SearchResult { title: string; url: string; }

const BLOCKED_DOMAINS = ['duckduckgo.com','google.com','bing.com','facebook.com','instagram.com','linkedin.com','youtube.com','yelp.com','yellowpages.com','mapquest.com','tripadvisor.com','wikipedia.org','reddit.com','pinterest.com','houzz.com','architecturaldigest.com'];
const NON_BUSINESS_TITLE_PATTERNS = [/\bbest\b/i,/\btop\b/i,/\blist\b/i,/\bdirectory\b/i,/\bguide\b/i,/\broundup\b/i,/\barticles?\b/i,/\bcompanies\b/i,/\bdesigners\b.*\bto know\b/i,/\byou need to know\b/i,/\bhow to\b/i,/\bstrategy\b/i,/\bpatients?\b/i,/\bget \d+x\b/i];

function decodeHtml(value: string): string { return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
function stripHtml(value: string): string { return value.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }
function extractResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const pattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const rawHref = decodeHtml(match[1]);
    const title = stripHtml(match[2]);
    let url = rawHref;
    try { if (rawHref.startsWith('//')) url = `https:${rawHref}`; const parsed = new URL(url); if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) url = decodeURIComponent(parsed.searchParams.get('uddg')!); } catch { continue; }
    if (url.startsWith('http') && title) results.push({ title, url });
  }
  return results;
}
function normalizeDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } }
function isUsefulBusinessWebsite(result: SearchResult): boolean { const domain = normalizeDomain(result.url); return Boolean(domain) && !BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`)) && !NON_BUSINESS_TITLE_PATTERNS.some((pattern) => pattern.test(result.title)); }

async function fetchWithRetry(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<string | null> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36', Accept: 'text/html,application/xhtml+xml' }, cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`Lead search provider returned ${response.status}`);
      return await response.text();
    } catch (error) { lastError = error; if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 250 * attempt)); }
    finally { clearTimeout(timeout); }
  }
  console.warn('[lead-search] provider failed after retries', lastError);
  return null;
}

function titleCaseDomain(domain: string): string {
  const base = domain.split('.')[0] ?? domain;
  return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

async function resolveBusinessName(result: SearchResult): Promise<string> {
  const html = await fetchWithRetry(result.url, SITE_NAME_TIMEOUT_MS);
  if (html) {
    const candidates = [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
      /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']application-name["']/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ];
    for (const pattern of candidates) {
      const match = html.match(pattern);
      const value = match?.[1] ? stripHtml(decodeHtml(match[1])).replace(/\s*[|·–—-]\s*(home|homepage|official website|digital marketing.*)$/i, '').trim() : '';
      if (value && value.length >= 2 && value.length <= 100 && !NON_BUSINESS_TITLE_PATTERNS.some((p) => p.test(value))) return value;
    }
  }
  return titleCaseDomain(normalizeDomain(result.url));
}

export async function webSearch(query: string): Promise<Lead[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const searchQueries = [normalizedQuery, `"${normalizedQuery}" business`, `${normalizedQuery} official website`];
  const allResults: SearchResult[] = [];
  for (const searchQuery of searchQueries) {
    const url = new URL(SEARCH_URL); url.searchParams.set('q', searchQuery); url.searchParams.set('kl', 'us-en');
    const html = await fetchWithRetry(url.toString());
    if (html) allResults.push(...extractResults(html));
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  const seenDomains = new Set<string>(); const leads: Lead[] = [];
  for (const result of allResults) {
    const domain = normalizeDomain(result.url);
    if (!domain || seenDomains.has(domain) || !isUsefulBusinessWebsite(result)) continue;
    seenDomains.add(domain);
    const name = await resolveBusinessName(result);
    leads.push({ name, website: result.url });
    if (leads.length >= 25) break;
  }
  return leads;
}
