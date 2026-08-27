import type { Lead } from '../types/lead.js';

const TIMEOUT_MS = 6500;
const MAX_ATTEMPTS = 2;
const MAX_RESULTS_PER_QUERY = 40;
const MAX_FINAL_LEADS = 30;
const ENRICH_CONCURRENCY = 8;

type Engine = 'ddg' | 'ddg-lite' | 'bing' | 'google' | 'searx';
interface SearchResult { title: string; url: string; }

const BLOCKED_DOMAINS = [
  'duckduckgo.com', 'bing.com', 'google.com', 'facebook.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'yelp.com', 'yellowpages.com', 'mapquest.com', 'tripadvisor.com', 'wikipedia.org',
  'reddit.com', 'pinterest.com', 'indeed.com', 'naukri.com', 'glassdoor.com', 'ziprecruiter.com',
];
const NON_BUSINESS_TITLE_PATTERNS = [
  /\bbest\b/i, /\btop\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\broundup\b/i,
  /\barticles?\b/i, /\bcompanies\b/i, /\bhow to\b/i, /\bstrategy\b/i, /\bjobs?\b/i,
  /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bapply now\b/i, /\bresume\b/i,
];
const NON_BUSINESS_PATH_PATTERNS = [/\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i];

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
function stripHtml(value: string): string { return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }
function normalizeDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
function titleCaseDomain(domain: string): string { return (domain.split('.')[0] ?? domain).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim(); }

function extractResults(html: string, engine: Engine): SearchResult[] {
  const patterns: RegExp[] = engine === 'ddg'
    ? [/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi]
    : engine === 'ddg-lite'
      ? [/<a[^>]+class=["'][^"']*result-link[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi]
      : engine === 'bing'
        ? [/<li[^>]+class=["'][^"']*b_algo[^"']*["'][\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi]
        : engine === 'google'
          ? [/<a[^>]+href=["'](?:\/url\?q=|)(https?:\/\/[^"'&]+)[^"']*["'][^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi]
          : [/<a[^>]+class=["'][^"']*result_header[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi];

  const results: SearchResult[] = [];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && results.length < MAX_RESULTS_PER_QUERY) {
      let url = decodeHtml(match[1]);
      const title = stripHtml(match[2]);
      try {
        if (url.startsWith('//')) url = `https:${url}`;
        const parsed = new URL(url, 'https://example.com');
        if (engine === 'ddg' || engine === 'ddg-lite') {
          if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) url = decodeURIComponent(parsed.searchParams.get('uddg')!);
        }
      } catch { continue; }
      if (/^https?:\/\//i.test(url) && title) results.push({ title, url });
    }
  }
  return results;
}

function useful(result: SearchResult): boolean {
  const domain = normalizeDomain(result.url);
  if (!domain || BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) return false;
  if (NON_BUSINESS_TITLE_PATTERNS.some((pattern) => pattern.test(result.title))) return false;
  try { if (NON_BUSINESS_PATH_PATTERNS.some((pattern) => pattern.test(new URL(result.url).pathname))) return false; } catch { return false; }
  return true;
}

async function fetchText(url: string, accept = 'text/html,application/xhtml+xml'): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 NexorAIOS/1.0', accept },
        redirect: 'follow', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch {
      if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    } finally { clearTimeout(timer); }
  }
  return null;
}

async function queryEngine(query: string, engine: Engine): Promise<SearchResult[]> {
  const base = engine === 'ddg' ? 'https://html.duckduckgo.com/html/'
    : engine === 'ddg-lite' ? 'https://lite.duckduckgo.com/lite/'
      : engine === 'bing' ? 'https://www.bing.com/search'
        : engine === 'google' ? 'https://www.google.com/search'
          : process.env.SEARXNG_URL;
  if (!base) return [];
  const url = new URL(base);
  url.searchParams.set('q', query);
  if (engine === 'ddg' || engine === 'ddg-lite') url.searchParams.set('kl', 'us-en');
  if (engine === 'google') url.searchParams.set('gbv', '1');
  if (engine === 'searx') url.searchParams.set('format', 'html');
  const html = await fetchText(url.toString());
  return html ? extractResults(html, engine) : [];
}

async function resolveName(result: SearchResult): Promise<string> {
  const html = await fetchText(result.url);
  if (html) {
    const patterns = [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      const value = match?.[1] ? stripHtml(match[1]).replace(/\s*[|·–—-]\s*(home|homepage|official website)$/i, '').trim() : '';
      if (value.length >= 2 && value.length <= 100 && !NON_BUSINESS_TITLE_PATTERNS.some((p) => p.test(value))) return value;
    }
  }
  return titleCaseDomain(normalizeDomain(result.url));
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = [];
  let cursor = 0;
  async function consume() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return output;
}

export async function freeWebSearch(query: string): Promise<{ leads: Lead[]; provider: string; errors: string[] }> {
  const normalized = query.trim();
  if (!normalized) return { leads: [], provider: 'free-auto', errors: [] };

  const queries = [
    normalized,
    `${normalized} official website`,
    `${normalized} contact`,
    `${normalized} services`,
    `${normalized} company -jobs -careers -vacancy -directory`,
  ];
  const errors: string[] = [];
  const engines: Engine[] = ['ddg', 'ddg-lite', 'bing', 'google', 'searx'];
  const all: SearchResult[] = [];

  for (const searchQuery of queries) {
    let found = false;
    for (const engine of engines) {
      if (engine === 'searx' && !process.env.SEARXNG_URL) continue;
      try {
        const results = (await queryEngine(searchQuery, engine)).filter(useful);
        if (results.length) {
          all.push(...results);
          found = true;
          break;
        }
        errors.push(`${engine}: zero usable results`);
      } catch (error) {
        errors.push(`${engine}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!found) errors.push(`No usable free-search result for query: ${searchQuery}`);
    if (all.length >= MAX_FINAL_LEADS) break;
  }

  const candidates: SearchResult[] = [];
  const seen = new Set<string>();
  for (const result of all) {
    const domain = normalizeDomain(result.url);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    candidates.push(result);
    if (candidates.length >= MAX_FINAL_LEADS) break;
  }

  const enriched = await mapLimit(candidates, ENRICH_CONCURRENCY, async (result) => ({ result, name: await resolveName(result) }));
  return {
    leads: enriched.map(({ result, name }) => ({ name, website: result.url })),
    provider: process.env.SEARXNG_URL ? 'free-auto:ddg>ddg-lite>bing>google>searxng' : 'free-auto:ddg>ddg-lite>bing>google',
    errors,
  };
}
