export type CrawlPage = {
  url: string;
  title?: string;
  text: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]
    ? decodeHtml(match[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  return title || undefined;
}

function extractText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

async function fetchPage(url: string): Promise<CrawlPage | null> {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(parsed, {
        headers: {
          'user-agent': 'NexorAIOS/1.0 research crawler',
          accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) return null;
      const html = await response.text();
      return { url: response.url || url, title: extractTitle(html), text: extractText(html) };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

export async function crawlPages(urls: string[], maxPages = 10): Promise<CrawlPage[]> {
  const limit = Math.max(1, Math.min(Math.floor(maxPages), 50));
  const uniqueUrls = [...new Set(urls.map((url) => url.trim()).filter(Boolean))].slice(0, limit);
  const results = await Promise.all(uniqueUrls.map(fetchPage));
  return results.filter((result): result is CrawlPage => result !== null);
}
