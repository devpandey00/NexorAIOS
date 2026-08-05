import { fetchHtml } from '../providers/html.provider.js';
import { parseWebsite } from '../providers/website.provider.js';
import { detectCompany } from '../providers/company.provider.js';
import { extractContacts } from '../providers/contact.provider.js';
import { extractSocialLinks } from '../providers/social.provider.js';
import { detectTechnologies } from '../providers/technology.provider.js';
import { calculateSEO } from '../providers/seo.provider.js';

export class ResearchService {
  async analyze(url: string) {
    try {
      const html = await fetchHtml(url);

      const website = parseWebsite(html);

      const company = detectCompany(url, website.title);

      const contacts = extractContacts(html);

      const social = extractSocialLinks(html);

      const technology = detectTechnologies(html);

      const seo = calculateSEO({
        title: website.title,
        description: website.description,
        h1: website.h1,
      });

      return {
        success: true,
        url,

        company,
        website,
        contacts,
        social,
        technology,
        seo,

        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const researchService = new ResearchService();
