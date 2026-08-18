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

type QueryTemplate = (
  industry: string,
  location: string,
  service: string,
  intent: string,
) => string;

const QUERY_TEMPLATES: QueryTemplate[] = [
  (industry, location, service, intent) => `${industry} in ${location} ${service} ${intent}`,
  (industry, location, _service, intent) => `best ${industry} in ${location} ${intent}`,
  (industry, location, _service, intent) => `${industry} ${location} businesses ${intent}`,
  (industry, location, service, _intent) => `${industry} ${location} ${service} companies`,
  (industry, location, service, _intent) => `${industry} ${location} looking for ${service}`,
  (industry, location, _service, _intent) => `${industry} in ${location} with weak online presence`,
  (industry, location, service, _intent) => `${industry} in ${location} ${service} agency prospects`,
  (industry, location, service, intent) => `${industry} ${location} ${intent} ${service}`,
];

const FALLBACK_QUERY_TEMPLATE: QueryTemplate = (industry, location, service, intent) =>
  `${industry} in ${location} ${service} ${intent}`;

function getQueryTemplate(index: number): QueryTemplate {
  const template = QUERY_TEMPLATES[index % QUERY_TEMPLATES.length];
  return template ?? FALLBACK_QUERY_TEMPLATE;
}

export class DiscoveryStrategyService {
  createQueries(input: Partial<DiscoveryStrategy>, limit = 20): DiscoveryQuery[] {
    const industries = input.industries?.length ? input.industries : DEFAULT_INDUSTRIES;
    const locations = input.locations?.length ? input.locations : ['Lucknow', 'Delhi', 'Dubai', 'London', 'New York'];
    const services = input.services?.length ? input.services : DEFAULT_SERVICES;
    const intents = input.intents?.length ? input.intents : DEFAULT_INTENTS;
    const queries: DiscoveryQuery[] = [];
    const seen = new Set<string>();

    let i = 0;
    let templateIndex = 0;
    const combinationCount = industries.length * locations.length * services.length * intents.length;
    const safetyLimit = Math.max(limit * 4, combinationCount * QUERY_TEMPLATES.length);

    while (queries.length < limit && i < safetyLimit) {
      const industry = industries[i % industries.length] ?? '';
      const location = locations[Math.floor(i / industries.length) % locations.length] ?? '';
      const service = services[Math.floor(i / (industries.length * locations.length)) % services.length] ?? '';
      const intent = intents[Math.floor(i / (industries.length * locations.length * services.length)) % intents.length] ?? '';

      if (!industry || !location || !service || !intent) {
        i += 1;
        continue;
      }

      const template = getQueryTemplate(templateIndex);
      const query = template(industry, location, service, intent).replace(/\s+/g, ' ').trim();
      const key = query.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        queries.push({ industry, location, service, intent, query });
      }

      templateIndex += 1;
      i += 1;
    }

    return queries;
  }
}

export const discoveryStrategyService = new DiscoveryStrategyService();