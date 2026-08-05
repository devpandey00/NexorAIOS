import * as cheerio from 'cheerio';

export interface ContactData {
  emails: string[];
  phones: string[];
}

export function extractContacts(html: string): ContactData {
  const $ = cheerio.load(html);

  // Extract emails from mailto: links
  const emailLinks = $("a[href^='mailto:']")
    .map((_, el) => $(el).attr('href')?.replace('mailto:', ''))
    .get();

  // Extract phones from tel: links
  const phoneLinks = $("a[href^='tel:']")
    .map((_, el) => $(el).attr('href')?.replace('tel:', ''))
    .get();

  // Fallback email regex
  const regexEmails = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  // Fallback phone regex
  const regexPhones =
    html.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/g) ?? [];

  const emails = [...new Set([...emailLinks, ...regexEmails])];

  const phones = [
    ...new Set(
      [...phoneLinks, ...regexPhones].filter((phone) => {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      }),
    ),
  ];

  return {
    emails,
    phones,
  };
}
