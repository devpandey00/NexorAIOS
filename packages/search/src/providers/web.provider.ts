import type { Lead } from '../types/lead.js';

const SEARCH_TIMEOUT_MS = 6500;
const SITE_NAME_TIMEOUT_MS = 4500;
const MAX_ATTEMPTS = 2;
const MAX_RESULTS_PER_QUERY = 40;
const MAX_FINAL_LEADS = 100;

interface SearchResult { title: string; url: string; }

const SEARCH_ENGINES = [
  'https://html.duckduckgo.com/html/',
  'https://www.google.com/search',
];

const BLOCKED_DOMAINS = [
  'duckduckgo.com','google.com','bing.com','facebook.com','instagram.com','linkedin.com','youtube.com',
  'yelp.com','yellowpages.com','mapquest.com','tripadvisor.com','wikipedia.org','reddit.com','pinterest.com',
  'houzz.com','architecturaldigest.com','indeed.com','naukri.com','foundit.in','internshala.com','glassdoor.com',
  'wellfound.com','cutshort.io','shine.com','timesjobs.com','monster.com','ziprecruiter.com',
];
const NON_BUSINESS_TITLE_PATTERNS = [
  /\bbest\b/i,/\btop\b/i,/\blist\b/i,/\bdirectory\b/i,/\bguide\b/i,/\broundup\b/i,/\barticles?\b/i,
  /\bcompanies\b/i,/\bdesigners\b.*\bto know\b/i,/\byou need to know\b/i,/\bhow to\b/i,/\bstrategy\b/i,
  /\bpatients?\b/i,/\bget \d+x\b/i,/\bjobs?\b/i,/\bvacanc(?:y|ies)\b/i,/\bcareers?\b/i,/\bhiring\b/i,
  /\bjob description\b/i,/\bsalary\b/i,/\bapply now\b/i,/\bresume\b/i,/\bcv\b/i,
];
const NON_BUSINESS_PATH_PATTERNS = [/\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i];

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function stripHtml(value: string): string { return value.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }
function normalizeDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } }
function titleCaseDomain(domain: string): string { const base = domain.split('.')[0] ?? domain; return base.replace(/[-_]+/g,' ').replace(/\b\w/g,(letter) => letter.toUpperCase()).trim(); }

function extractResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const patterns = [
    /<a[^>]+class="[^\"]*result__a[^\"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href="(https?:\/\/[^\"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null && results.length < MAX_RESULTS_PER_QUERY) {
      const rawHref = decodeHtml(match[1]);
      const title = stripHtml(match[2]);
      let url = rawHref;
      try {
        if (rawHref.startsWith('//')) url = `https:${rawHref}`;
        const parsed = new URL(url);
        if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) url = decodeURIComponent(parsed.searchParams.get('uddg')!);
      } catch { continue; }
      if (url.startsWith('http') && title) results.push({ title, url });
    }
    if (results.length >= MAX_RESULTS_PER_QUERY) break;
  }
  return results;
}

function isUsefulBusinessWebsite(result: SearchResult): boolean {
  const domain = normalizeDomain(result.url);
  if (!domain || BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) return false;
  if (NON_BUSINESS_TITLE_PATTERNS.some((pattern) => pattern.test(result.title))) return false;
  try { if (NON_BUSINESS_PATH_PATTERNS.some((pattern) => pattern.test(new URL(result.url).pathname))) return false; } catch { return false; }
  return true;
}

async function fetchFast(url: string, timeoutMs: number): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 NexorAIOS/1.0', Accept: 'text/html,application/xhtml+xml' }, cache: 'no-store', redirect: 'follow', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch { if (attempt < MAX_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 150 * attempt)); }
    finally { clearTimeout(timeout); }
  }
  return null;
}

async function resolveBusinessName(result: SearchResult): Promise<string> {
  const html = await fetchFast(result.url, SITE_NAME_TIMEOUT_MS);
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
      const value = match?.[1] ? stripHtml(decodeHtml(match[1])).replace(/\s*[|·–—-]\s*(home|homepage|official website|digital marketing.*)$/i,'').trim() : '';
      if (value && value.length >= 2 && value.length <= 100 && !NON_BUSINESS_TITLE_PATTERNS.some((p) => p.test(value))) return value;
    }
  }
  return titleCaseDomain(normalizeDomain(result.url));
}

export async function webSearch(query: string): Promise<Lead[]> {
  const normalizedQuery = query.trim(); if (!normalizedQuery) return [];
  const searchQueries = [normalizedQuery, `"${normalizedQuery}" official website`, `${normalizedQuery} contact`, `${normalizedQuery} services`, `${normalizedQuery} company`, `${normalizedQuery} -jobs -careers -vacancy -indeed -linkedin -naukri`];
  const allResults: SearchResult[] = [];
  for (const searchQuery of searchQueries) {
    let found = false;
    for (const engine of SEARCH_ENGINES) {
      const url = new URL(engine); url.searchParams.set('q', searchQuery); if (engine.includes('duckduckgo')) url.searchParams.set('kl','us-en');
      const html = await fetchFast(url.toString(), SEARCH_TIMEOUT_MS);
      if (!html) continue;
      const results = extractResults(html);
      if (results.length) { allResults.push(...results); found = true; break; }
    }
    if (!found) continue;
  }

  const candidates: SearchResult[] = []; const seenDomains = new Set<string>();
  for (const result of allResults) {
    const domain = normalizeDomain(result.url);
    if (!domain || seenDomains.has(domain) || !isUsefulBusinessWebsite(result)) continue;
    seenDomains.add(domain); candidates.push(result);
    if (candidates.length >= MAX_FINAL_LEADS) break;
  }

  const enriched = await Promise.all(candidates.map(async (result) => ({ result, name: await resolveBusinessName(result) })));
  return enriched.map(({ result, name }) => ({ name, website: result.url }));
}
