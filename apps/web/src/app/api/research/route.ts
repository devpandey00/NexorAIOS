import { NextResponse } from 'next/server';

function normaliseUrl(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 7000);
}

function numberIsVerified(phone: string) {
  const configured = (process.env.VERIFIED_WHATSAPP_NUMBERS ?? '')
    .split(',')
    .map((item) => item.replace(/\D/g, ''))
    .filter(Boolean);
  const digits = phone.replace(/\D/g, '');
  return configured.includes(digits);
}

async function braveSearch(query: string) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return '';
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    cache: 'no-store',
  });
  if (!response.ok) return '';
  const data = await response.json();
  return (data.web?.results ?? [])
    .map((item: { title?: string; description?: string; url?: string }) => `${item.title ?? ''} ${item.description ?? ''} ${item.url ?? ''}`)
    .join('\n')
    .slice(0, 5000);
}

async function generateMessage(lead: { name: string; niche: string; website?: string; location?: string }, research: string, finding: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const existing = Boolean(lead.website);
    return existing
      ? `Hi ${lead.name} team, Dev this side 👋\n\nI came across ${lead.name} while researching ${lead.niche.toLowerCase()} businesses in ${lead.location ?? 'the area'} and went through your online presence properly.\n\nYou already have a website, so I’m not reaching out with the usual “you need a website” pitch. I noticed a few specific opportunities around the current website, patient/customer journey and paid acquisition.\n\nI work on conversion-focused website optimisation + Google & Meta Ads. The idea is simple: turn the traffic you are already getting into more enquiries, calls and WhatsApp conversations.\n\nI noted a few specific things I’d change for ${lead.name}. If you’re open to it, I can send the 3 most useful observations here — no sales call.`
      : `Hi ${lead.name} team, Dev this side 👋\n\nI came across ${lead.name} while researching ${lead.niche.toLowerCase()} businesses in ${lead.location ?? 'the area'}. I was looking for your official website and couldn’t find a strong dedicated one.\n\nThat’s a missed opportunity because Google/Meta traffic is much easier to convert when it lands on a website built around the exact service a customer is looking for.\n\nI build conversion-focused websites and run Google & Meta Ads together, so the goal isn’t just a good-looking website — it’s a system that turns searches into enquiries.\n\nI already have an idea of how I’d structure ${lead.name}'s website and first campaigns. Want me to send you the quick version here?`;
  }

  const prompt = `You are an elite human sales copywriter for Nexor Media. Write a short WhatsApp outreach message to a business owner. Never sound like mass cold outreach. Use only defensible observations. Do not claim audits, numbers, errors, ads, clients or credentials that are not in the research.\n\nBusiness: ${lead.name}\nNiche: ${lead.niche}\nLocation: ${lead.location ?? ''}\nWebsite: ${lead.website ?? 'none found'}\nResearch: ${research}\nFinding: ${finding}\n\nRules: 120-190 words, natural Indian business tone, open with “Dev this side 👋”, mention 2-3 concrete observations, pitch website build/redesign + Google/Meta Ads only where relevant, and end with a low-friction question. No pricing. No fake case studies.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', temperature: 0.7, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) throw new Error('AI provider failed');
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function POST(request: Request) {
  try {
    const lead = await request.json();
    const url = normaliseUrl(lead.website);
    let siteText = '';
    let title = '';
    if (url) {
      try {
        const response = await fetch(url, { redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(7000) });
        const html = await response.text();
        siteText = cleanText(html);
        title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? '';
      } catch {
        siteText = 'Website could not be fetched automatically.';
      }
    }

    const searchText = await braveSearch(`${lead.name} ${lead.location ?? ''} ${lead.niche ?? ''}`);
    const research = `${title}\n${siteText}\n${searchText}`.slice(0, 11000);
    const hasWebsite = Boolean(url && siteText && !siteText.includes('could not be fetched'));
    const visibleErrors = (research.match(/\b(typo|error|incorrect|placeholder|lorem|demo|template|coming soon|not found)\b/gi) ?? []).length;
    const score = Math.min(99, Math.max(42, 58 + (hasWebsite ? 10 : 18) + visibleErrors * 6));
    const whatsappVerified = numberIsVerified(lead.phone ?? '');
    const finding = hasWebsite
      ? `Existing website found. ${visibleErrors ? `${visibleErrors} quality/template signals detected; ` : ''}strongest opportunity is conversion optimisation and treatment/service-specific paid landing pages.`
      : 'No usable official website was found automatically; strongest opportunity is a new conversion-focused website connected to Google/Meta Ads.';
    const message = await generateMessage(lead, research, finding);

    return NextResponse.json({ ok: true, score, whatsappVerified, finding, message, title, sourceCount: searchText ? 5 : 1 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Research failed' }, { status: 500 });
  }
}
