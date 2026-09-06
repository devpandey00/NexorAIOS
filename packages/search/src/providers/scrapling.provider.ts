import type { Lead } from '../types/lead.js';

const TIMEOUT_MS = 120_000;

interface ScraplingLead {
  name?: string;
  website?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  location?: string | null;
  score?: number;
}

interface ScraplingResponse {
  success?: boolean;
  leads?: ScraplingLead[];
  count?: number;
  error?: string;
}

function clean(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function dedupe(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = [lead.website, lead.phone, lead.name]
      .map((value) => String(value ?? '').trim().toLowerCase().replace(/\/$/, ''))
      .join('|');
    if (!lead.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scraplingSearch(query: string): Promise<Lead[]> {
  const baseUrl = process.env.SCRAPLING_WORKER_URL?.trim().replace(/\/$/, '');
  if (!baseUrl) return [];

  const apiKey = process.env.SCRAPLING_WORKER_API_KEY?.trim();
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/v1/discover`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        queries: [query],
        location: query,
        limit: 30,
      }),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) return [];
    const payload = (await response.json().catch(() => ({}))) as ScraplingResponse;
    if (payload.success === false || !Array.isArray(payload.leads)) return [];

    return dedupe(payload.leads.map((item) => ({
      name: clean(item.name) ?? '',
      website: clean(item.website),
      email: clean(item.email),
      phone: clean(item.phone),
      whatsapp: clean(item.whatsapp),
      linkedin: clean(item.linkedin),
      instagram: clean(item.instagram),
      facebook: clean(item.facebook),
      address: clean(item.location),
    })));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
