import { NextResponse } from 'next/server';
import { discoveryStrategyService } from '@nexor/core';
import { getDatabaseClients, LeadStatus, SocialPlatform } from '@nexor/database';

const DEFAULT_INDUSTRIES = [
  'digital marketing agencies',
  'real estate agencies',
  'dental clinics',
  'law firms',
  'immigration consultants',
  'interior design companies',
  'construction companies',
  'accounting firms',
  'fitness studios',
  'aesthetic clinics',
];

const DEFAULT_LOCATIONS = [
  'Dubai UAE',
  'London UK',
  'New York USA',
  'Los Angeles USA',
  'Toronto Canada',
  'Sydney Australia',
  'Melbourne Australia',
];

const INDIA_PATTERN = /\b(india|delhi|mumbai|lucknow|bangalore|bengaluru|hyderabad|pune|kolkata|chennai|ahmedabad|noida|gurgaon|gurugram)\b/i;

function countryForLocation(location: string) {
  if (/\b(uae|dubai|abu dhabi)\b/i.test(location)) return 'United Arab Emirates';
  if (/\b(uk|london|manchester|birmingham)\b/i.test(location)) return 'United Kingdom';
  if (/\b(usa|united states|new york|los angeles|chicago|miami|san francisco|austin)\b/i.test(location)) return 'United States';
  if (/\b(canada|toronto|vancouver|montreal)\b/i.test(location)) return 'Canada';
  if (/\b(australia|sydney|melbourne|brisbane|perth)\b/i.test(location)) return 'Australia';
  return location.trim();
}

function cleanStrings(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function workerConfig() {
  const baseUrl = process.env.SCRAPLING_WORKER_URL?.trim().replace(/\/$/, '');
  const apiKey = process.env.SCRAPLING_WORKER_API_KEY?.trim();
  return { baseUrl, apiKey };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { baseUrl, apiKey } = workerConfig();
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'SCRAPLING_WORKER_URL is not configured.' }, { status: 503 });
    }

    const locations = cleanStrings(body.locations, DEFAULT_LOCATIONS).filter((location) => !INDIA_PATTERN.test(location));
    const industries = cleanStrings(body.industries, DEFAULT_INDUSTRIES);
    const services = cleanStrings(body.services, ['lead generation', 'Google Ads', 'Meta Ads', 'SEO', 'website development']);
    const limit = typeof body.limit === 'number' && Number.isFinite(body.limit) ? Math.max(1, Math.min(50, Math.floor(body.limit))) : 25;

    if (!locations.length) {
      return NextResponse.json({ success: false, error: 'International locations are required; India locations are intentionally excluded.' }, { status: 400 });
    }

    const strategyQueries = discoveryStrategyService.createQueries({ industries, locations, services, intents: ['needs more leads', 'grow online'] }, Math.min(16, locations.length * 2));
    const queries = strategyQueries.map((item) => `${item.query} -jobs -careers -vacancy -directory`).slice(0, 16);

    const response = await fetch(`${baseUrl}/v1/discover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-Key': apiKey } : {}),
      },
      body: JSON.stringify({ queries, location: locations.join(', '), limit }),
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ success: false, error: payload?.error ?? `Scrapling worker failed (${response.status})` }, { status: 502 });
    }

    const leads = Array.isArray(payload?.leads) ? payload.leads : [];
    const prisma = getDatabaseClients().write;
    let created = 0;
    let updated = 0;
    const saved = [];

    for (const item of leads) {
      const businessName = typeof item?.name === 'string' ? item.name.trim() : '';
      const website = typeof item?.website === 'string' ? item.website.trim() : '';
      if (!businessName || !website) continue;
      const location = typeof item?.location === 'string' ? item.location : locations[0] ?? '';
      const country = countryForLocation(location);
      if (INDIA_PATTERN.test(`${location} ${country}`)) continue;

      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            { website },
            ...(typeof item?.email === 'string' && item.email.includes('@') ? [{ email: item.email }] : []),
            { businessName },
          ],
        },
      });

      const notes = JSON.stringify({
        metadata: {
          source: 'SCRAPLING',
          leadType: 'BUSINESS',
          location,
          sourceQuery: queries.find((query) => query.toLowerCase().includes(businessName.toLowerCase().split(' ')[0] ?? '')) ?? queries[0],
          discoveredAt: new Date().toISOString(),
          score: Number(item?.score ?? 0),
          phone: item?.phone ?? null,
        },
      });

      const data = {
        businessName,
        niche: typeof body?.niche === 'string' && body.niche.trim() ? body.niche.trim() : (industries[0] ?? 'business'),
        country,
        website,
        email: typeof item?.email === 'string' && item.email.includes('@') ? item.email : undefined,
        whatsapp: typeof item?.whatsapp === 'string' && item.whatsapp.trim() ? item.whatsapp : undefined,
        linkedin: typeof item?.linkedin === 'string' ? item.linkedin : undefined,
        instagram: typeof item?.instagram === 'string' ? item.instagram : undefined,
        auditScore: Number.isFinite(Number(item?.score)) ? Math.max(0, Math.min(100, Math.round(Number(item.score)))) : undefined,
        notes,
      };

      const lead = existing
        ? await prisma.lead.update({ where: { id: existing.id }, data: { ...data, status: existing.status === LeadStatus.NEW ? LeadStatus.RESEARCHED : existing.status } })
        : await prisma.lead.create({ data: { ...data, status: LeadStatus.RESEARCHED } });

      if (existing) updated += 1; else created += 1;

      const socialLinks: Array<[SocialPlatform, string | undefined]> = [
        [SocialPlatform.LINKEDIN, item?.linkedin],
        [SocialPlatform.INSTAGRAM, item?.instagram],
        [SocialPlatform.FACEBOOK, item?.facebook],
      ];
      for (const [platform, url] of socialLinks) {
        if (typeof url !== 'string' || !url.startsWith('http')) continue;
        await prisma.socialProfile.upsert({
          where: { leadId_platform: { leadId: lead.id, platform } },
          create: { leadId: lead.id, platform, url, source: 'SCRAPLING', confidence: 85 },
          update: { url, source: 'SCRAPLING', confidence: 85 },
        });
      }
      saved.push(lead);
    }

    return NextResponse.json({
      success: true,
      provider: 'scrapling',
      queries,
      discovered: leads.length,
      created,
      updated,
      leads: saved,
      providerResponse: { count: payload?.count ?? leads.length },
    });
  } catch (error) {
    console.error('[SCRAPLING DISCOVERY ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
