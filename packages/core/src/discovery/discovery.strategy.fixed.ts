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

export class DiscoveryStrategyService {
  createQueries(input: Partial<DiscoveryStrategy>, limit = 20): DiscoveryQuery[] {
    const industries = input.industries?.length ? input.industries : DEFAULT_INDUSTRIES;
    const locations = input.locations?.length ? input.locations : ['Lucknow', 'Delhi', 'Dubai', 'London', 'New York'];
    const services = input.services?.length ? input.services : DEFAULT_SERVICES;
    const intents = input.intents?.length ? input.intents : DEFAULT_INTENTS;
    const queries: DiscoveryQuery[] = [];
    const seen = new Set<string>();

    let i = 0;
    while (queries.length < limit && i < industries.length * locations.length * services.length * intents.length) {
      const industry = industries[i % industries.length] ?? '';
      const location = locations[Math.floor(i / industries.length) % locations.length] ?? '';
      const service = services[Math.floor(i / (industries.length * locations.length)) % services.length] ?? '';
      const intent = intents[Math.floor(i / (industries.length * locations.length * services.length)) % intents.length] ?? '';
      if (!industry || !location || !service || !intent) {
        i += 1;
        continue;
      }
      const query = `${industry} in ${location} ${service} ${intent}`.replace(/\s+/g, ' ').trim();
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
