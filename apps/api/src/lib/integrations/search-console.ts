import { getGoogleAccessToken, googleIntegrationConfigured } from './google-service-account';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const ENDPOINT = 'https://searchconsole.googleapis.com/webmasters/v3';

export type SearchConsoleReport = {
  siteUrl: string;
  period: { startDate: string; endDate: string };
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  lastUpdated: string;
};

function siteUrl() { return process.env.SEARCH_CONSOLE_SITE_URL?.trim() || ''; }
function dates(startDate?: string, endDate?: string) {
  const end = endDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('Search Console dates must use YYYY-MM-DD');
  if (start > end) throw new Error('Search Console startDate must not be after endDate');
  return { start, end };
}

async function request(path: string, init?: RequestInit) {
  const token = await getGoogleAccessToken([SCOPE]);
  const response = await fetch(`${ENDPOINT}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Search Console API returned ${response.status}`);
  return response.json();
}

export async function checkSearchConsoleConnection() {
  const site = siteUrl();
  if (!site || !googleIntegrationConfigured()) return { status: 'CONFIGURATION_REQUIRED' as const, siteUrl: site || null };
  await request(`/sites/${encodeURIComponent(site)}`);
  return { status: 'CONNECTED' as const, siteUrl: site };
}

export async function runSearchConsoleReport(options: { startDate?: string; endDate?: string; dimensions?: string[] } = {}): Promise<SearchConsoleReport> {
  const site = siteUrl();
  if (!site) throw new Error('SEARCH_CONSOLE_SITE_URL is not configured');
  const range = dates(options.startDate, options.endDate);
  const dimensions = options.dimensions?.length ? options.dimensions : ['query'];
  const data = await request(`/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
    method: 'POST',
    body: JSON.stringify({ startDate: range.start, endDate: range.end, dimensions, rowLimit: 1000, dataState: 'final' }),
  }) as { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> };
  return {
    siteUrl: site,
    period: { startDate: range.start, endDate: range.end },
    rows: (data.rows || []).map((row) => ({ keys: row.keys || [], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 })),
    lastUpdated: new Date().toISOString(),
  };
}
