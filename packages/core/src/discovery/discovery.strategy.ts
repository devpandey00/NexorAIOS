export interface DiscoveryStrategy {
  industries: string[];
  locations: string[];
  services: string[];
  intents: string[];
}

export interface DiscoveryQuery {
  industry: string;
  location: string;
  service: string;
  intent: string;
  query: string;
}

const DEFAULT_INDUSTRIES = [
  'dentists', 'clinics', 'real estate agencies', 'construction companies',
  'interior designers', 'law firms', 'gyms', 'salons', 'restaurants',
  'coaching businesses', 'immigration consultants', 'local service businesses',
];
const DEFAULT_SERVICES = [
  'SEO', 'Google Ads', 'Meta Ads', 'social media marketing',
  'website development', 'lead generation', 'conversion optimization',
];
const DEFAULT_INTENTS = [
  'needs more leads', 'needs a better website', 'improve Google visibility',
  'improve social media', 'grow online', 'local business marketing',
];

type QueryTemplate = (industry: string, location: string, service: string) => string;

const QUERY_TEMPLATES: QueryTemplate[] = [
  (industry, location, service) => `"${industry}" "${location}" "${service}"`,
  (industry, location) => `"${industry}" "${location}" official website`,
  (industry, location) => `"${industry}" "${location}" contact`,
  (industry, location, service) => `"${industry}" "${location}" ${service} agency`,
  (industry, location) => `${industry} ${location} phone`,
  (industry, location) => `${industry} in ${location}`,
  (industry, location, service) => `${industry} in ${location} ${service}`,
  (industry, location) => `site:google.com/maps "${industry}" "${location}"`,
];

function getQueryTemplate(index: number): QueryTemplate {
  return QUERY_TEMPLATES[index % QUERY_TEMPLATES.length] ?? QUERY_TEMPLATES[0]!;
}

export class DiscoveryStrategyService {
  createQueries(input: Partial<DiscoveryStrategy>, limit = 20): DiscoveryQuery[] {
    const industries = input.industries?.map((value) => value.trim()).filter(Boolean).length ? input.industries!.map((value) => value.trim()).filter(Boolean) : DEFAULT_INDUSTRIES;
    const locations = input.locations?.map((value) => value.trim()).filter(Boolean).length ? input.locations!.map((value) => value.trim()).filter(Boolean) : ['Lucknow', 'Delhi', 'Dubai', 'London', 'New York'];
    const services = input.services?.map((value) => value.trim()).filter(Boolean).length ? input.services!.map((value) => value.trim()).filter(Boolean) : DEFAULT_SERVICES;
    const intents = input.intents?.map((value) => value.trim()).filter(Boolean).length ? input.intents!.map((value) => value.trim()).filter(Boolean) : DEFAULT_INTENTS;
    const queries: DiscoveryQuery[] = [];
    const seen = new Set<string>();
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

    let i = 0;
    while (queries.length < safeLimit && i < safeLimit * 8) {
      const industry = industries[i % industries.length] ?? '';
      const location = locations[Math.floor(i / industries.length) % locations.length] ?? '';
      const service = services[Math.floor(i / (industries.length * locations.length)) % services.length] ?? '';
      const intent = intents[Math.floor(i / (industries.length * locations.length * services.length)) % intents.length] ?? '';
      if (!industry || !location || !service || !intent) {
        i += 1;
        continue;
      }

      const query = getQueryTemplate(i)(industry, location, service).replace(/\s+/g, ' ').trim();
      const key = query.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        queries.push({ industry, location, service, intent, query });
      }
      i += 1;
    }
    return queries;
  }
}

export const discoveryStrategyService = new DiscoveryStrategyService();
