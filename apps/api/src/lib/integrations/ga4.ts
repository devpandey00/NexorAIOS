import { getGoogleAccessToken, googleIntegrationConfigured } from './google-service-account';

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';

export type GA4Report = {
  propertyId: string;
  period: { startDate: string; endDate: string };
  rows: Array<Record<string, string | number>>;
  totals: Record<string, string | number>;
  lastUpdated: string;
};

function propertyId() {
  return process.env.GA4_PROPERTY_ID?.trim() || '';
}

function dateRange(startDate?: string, endDate?: string) {
  const end = endDate || new Date().toISOString().slice(0, 10);
  const start = startDate || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error('GA4 dates must use YYYY-MM-DD');
  if (start > end) throw new Error('GA4 startDate must not be after endDate');
  return { start, end };
}

async function request(path: string, init?: RequestInit) {
  const token = await getGoogleAccessToken([SCOPE]);
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GA4 API returned ${response.status}`);
  return response.json();
}

export async function checkGA4Connection() {
  const id = propertyId();
  if (!id || !googleIntegrationConfigured()) return { status: 'CONFIGURATION_REQUIRED' as const, propertyId: id || null };
  await request(`/properties/${encodeURIComponent(id)}/metadata`);
  return { status: 'CONNECTED' as const, propertyId: id };
}

export async function runGA4Report(options: { startDate?: string; endDate?: string } = {}): Promise<GA4Report> {
  const id = propertyId();
  if (!id) throw new Error('GA4_PROPERTY_ID is not configured');
  const range = dateRange(options.startDate, options.endDate);
  const data = await request(`/properties/${encodeURIComponent(id)}:runReport`, {
    method: 'POST',
    body: JSON.stringify({
      dateRanges: [{ startDate: range.start, endDate: range.end }],
      dimensions: [
        { name: 'date' },
        { name: 'sessionDefaultChannelGroup' },
        { name: 'country' },
        { name: 'deviceCategory' },
      ],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'eventCount' },
        { name: 'conversions' },
        { name: 'screenPageViews' },
      ],
      limit: '10000',
    }),
  }) as { dimensionHeaders?: Array<{ name: string }>; metricHeaders?: Array<{ name: string }>; rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>; totals?: Array<{ metricValues?: Array<{ value: string }> }> };

  const dimensions = (data.dimensionHeaders || []).map((h) => h.name);
  const metrics = (data.metricHeaders || []).map((h) => h.name);
  const rows = (data.rows || []).map((row) => {
    const output: Record<string, string | number> = {};
    dimensions.forEach((name, index) => { output[name] = row.dimensionValues?.[index]?.value ?? ''; });
    metrics.forEach((name, index) => { output[name] = Number(row.metricValues?.[index]?.value ?? 0); });
    return output;
  });
  const totals: Record<string, string | number> = {};
  metrics.forEach((name, index) => { totals[name] = Number(data.totals?.[0]?.metricValues?.[index]?.value ?? 0); });
  return { propertyId: id, period: { startDate: range.start, endDate: range.end }, rows, totals, lastUpdated: new Date().toISOString() };
}
