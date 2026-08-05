import * as cheerio from 'cheerio';

export interface WebsiteData {
  title: string;
  description: string;
  h1: string[];
  h2: string[];
}

export function parseWebsite(html: string): WebsiteData {
  const $ = cheerio.load(html);

  return {
    title: $('title').text().trim(),

    description: $('meta[name="description"]').attr('content') ?? '',

    h1: $('h1')
      .map((_, el) => $(el).text().trim())
      .get(),

    h2: $('h2')
      .map((_, el) => $(el).text().trim())
      .get(),
  };
}
