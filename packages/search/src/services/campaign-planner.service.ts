export interface SearchRotation {
  industry: string;
  service: string;
  location: string;
  intent: string;
  query: string;
  rotationIndex: number;
}

const INDUSTRIES = [
  'interior design',
  'construction company',
  'real estate agency',
  'dental clinic',
  'law firm',
  'accounting firm',
  'fitness studio',
  'restaurant',
  'hotel',
  'wedding planner',
  'architecture firm',
  'landscaping company',
  'roofing company',
  'home remodeling company',
  'medical clinic',
  'photography studio',
  'car dealership',
  'education consultancy',
  'immigration consultancy',
  'ecommerce brand',
];

const SERVICES = [
  'website design',
  'SEO',
  'Google Ads',
  'Meta Ads',
  'lead generation',
  'conversion optimization',
  'social media marketing',
];

const LOCATIONS = [
  'New York',
  'Los Angeles',
  'Miami',
  'Chicago',
  'Houston',
  'Dallas',
  'Toronto',
  'London',
  'Dubai',
  'Singapore',
  'Sydney',
  'Mumbai',
  'Delhi',
  'Bangalore',
  'Lucknow',
];

const INTENTS = [
  'official website',
  'needs more leads',
  'poor website',
  'Google visibility',
  'Google Ads',
  'Meta Ads',
  'digital marketing',
  'book a consultation',
];

function pick<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length];
}

export class CampaignPlannerService {
  plan(rotationIndex = 0): SearchRotation {
    const industry = pick(INDUSTRIES, rotationIndex);
    const service = pick(SERVICES, Math.floor(rotationIndex / INDUSTRIES.length));
    const location = pick(LOCATIONS, Math.floor(rotationIndex / (INDUSTRIES.length * SERVICES.length)));
    const intent = pick(INTENTS, Math.floor(rotationIndex / (INDUSTRIES.length * SERVICES.length * LOCATIONS.length)));

    const query = `${industry} ${service} ${location} ${intent}`;

    return {
      industry,
      service,
      location,
      intent,
      query,
      rotationIndex,
    };
  }

  planBatch(startIndex: number, count: number): SearchRotation[] {
    const safeCount = Math.max(1, Math.min(count, 25));
    return Array.from({ length: safeCount }, (_, offset) => this.plan(startIndex + offset));
  }

  getRotationSpaceSize(): number {
    return INDUSTRIES.length * SERVICES.length * LOCATIONS.length * INTENTS.length;
  }
}

export const campaignPlannerService = new CampaignPlannerService();
