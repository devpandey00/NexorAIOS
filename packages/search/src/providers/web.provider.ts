import { Lead } from '../types/lead.js';

const SEARCH_URL = 'https://html.duckduckgo.com/html/';

interface SearchResult {
  title: string;
  url: string;
}

const BLOCKED_DOMAINS = [
  'duckduckgo.com',
  'google.com',
  'bing.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'yelp.com',
  'yellowpages.com',
  'mapquest.com',
  'tripadvisor.com',
  'wikipedia.org',
  'reddit.com',
  'pinterest.com',
  'houzz.com',
  'architecturaldigest.com',
];

const NON_BUSINESS_TITLE_PATTERNS = [
  /\bbest\b/i,
  /\btop\b/i,
  /\blist\b/i,
  /\bdirectory\b/i,
  /\bguide\b/i,
  /\broundup\b/i,
  /\barticles?\b/i,
  /\bcompanies\b/i,
  /\bdesigners\b.*\bto know\b/i,
  /\byou need to know\b/i,
];

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  const pattern = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const rawHref = decodeHtml(match[1]);
    const rawTitle = match[2];

    const title = rawTitle
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let url = rawHref;

    try {
      if (rawHref.startsWith('//')) {
        url = `https:${rawHref}`;
      }

      const parsed = new URL(url);

      if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('uddg')) {
        url = decodeURIComponent(parsed.searchParams.get('uddg')!);
      }
    } catch {
      continue;
    }

    if (!url.startsWith('http')) {
      continue;
    }

    if (!title) {
      continue;
    }

    results.push({
      title,
      url,
    });
  }

  return results;
}

function normalizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function looksLikeDirectoryOrList(title: string): boolean {
  return NON_BUSINESS_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

function isUsefulBusinessWebsite(result: SearchResult): boolean {
  const domain = normalizeDomain(result.url);

  if (!domain) {
    return false;
  }

  if (isBlockedDomain(domain)) {
    return false;
  }

  if (looksLikeDirectoryOrList(result.title)) {
    return false;
  }

  return true;
}

export async function webSearch(query: string): Promise<Lead[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const searchQueries = [
    normalizedQuery,
    `"${normalizedQuery}" business`,
    `${normalizedQuery} official website`,
  ];

  const allResults: SearchResult[] = [];

  for (const searchQuery of searchQueries) {
    const url = new URL(SEARCH_URL);

    url.searchParams.set('q', searchQuery);
    url.searchParams.set('kl', 'us-en');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      continue;
    }

    const html = await response.text();

    allResults.push(...extractResults(html));

    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  const seenDomains = new Set<string>();
  const leads: Lead[] = [];

  for (const result of allResults) {
    const domain = normalizeDomain(result.url);

    if (!domain || seenDomains.has(domain)) {
      continue;
    }

    if (!isUsefulBusinessWebsite(result)) {
      continue;
    }

    seenDomains.add(domain);

    leads.push({
      name: result.title,
      website: result.url,
    });

    if (leads.length >= 25) {
      break;
    }
  }

  return leads;
}
