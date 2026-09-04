import * as cheerio from 'cheerio';

export interface ContactData {
  emails: string[];
  phones: string[];
}

export function extractContacts(html: string): ContactData {
  const $ = cheerio.load(html);

  // Extract emails from mailto: links
  const emailLinks = $("a[href^='mailto:']")
    .map((_, el) => $(el).attr('href')?.replace('mailto:', '').split('?')[0])
    .get();

  // Extract phones from tel: links
  const phoneLinks = $("a[href^='tel:']")
    .map((_, el) => $(el).attr('href')?.replace('tel:', '').split('?')[0])
    .get();

  // Many businesses publish WhatsApp chat buttons instead of tel: links.
  // Capture the phone parameter from wa.me and api.whatsapp.com links.
  const whatsappLinks = $("a[href*='wa.me/'], a[href*='api.whatsapp.com/send']")
    .map((_, el) => {
      const href = $(el).attr('href') ?? '';
      try {
        const url = new URL(href, 'https://example.com');
        const phone = url.searchParams.get('phone');
        if (phone) return phone;
        const match = url.pathname.match(/\/([+\d][\d\s().-]{8,})$/);
        return match?.[1];
      } catch {
        const match = href.match(/wa\.me\/([+\d][\d\s().-]{8,})/i);
        return match?.[1];
      }
    })
    .get();

  // Fallback email regex
  const regexEmails = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];

  // Fallback phone regex
  const regexPhones =
    html.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}/g) ?? [];

  const emails = [...new Set([...emailLinks, ...regexEmails])];

  const phones = [
    ...new Set(
      [...phoneLinks, ...whatsappLinks, ...regexPhones].filter((phone) => {
        const digits = String(phone).replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      }),
    ),
  ];

  return {
    emails,
    phones,
  };
}
