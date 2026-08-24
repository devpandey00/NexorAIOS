import { CheerioCrawler } from 'crawlee';

export type CrawlPage = {
  url: string;
  title?: string;
  text: string;
};

export async function crawlPages(urls: string[], maxPages = 10): Promise<CrawlPage[]> {
  const results: CrawlPage[] = [];
  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: Math.max(1, maxPages),
    async requestHandler({ request, $, log }) {
      const title = $('title').first().text().trim() || undefined;
      const text = $('body').text(' ').replace(/\s+/g, ' ').trim();
      results.push({ url: request.url, title, text });
      log.debug(`Crawled ${request.url}`);
    },
  });
  await crawler.run(urls.slice(0, maxPages));
  return results;
}
