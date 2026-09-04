import { listOpportunities, type Opportunity } from './opportunities';

export type MatchInput = {
  kind?: 'JOB' | 'COMPANY' | 'INFLUENCER';
  keywords: string[];
  location?: string | null;
};

function score(opportunity: Opportunity, input: MatchInput) {
  const haystack = `${opportunity.title} ${opportunity.organization || ''} ${opportunity.location || ''} ${opportunity.notes || ''}`.toLowerCase();
  const keywords = input.keywords.map((x) => x.trim().toLowerCase()).filter(Boolean);
  const matched = keywords.filter((keyword) => haystack.includes(keyword));
  const locationMatch = input.location?.trim() ? haystack.includes(input.location.trim().toLowerCase()) : false;
  const value = Math.min(100, matched.length * 18 + (locationMatch ? 20 : 0) + (opportunity.url ? 10 : 0));
  return { ...opportunity, matchScore: value, matchedKeywords: matched };
}

export async function matchOpportunities(input: MatchInput, limit = 50) {
  const opportunities = await listOpportunities({ kind: input.kind, limit: Math.min(Math.max(limit, 1), 200) });
  return opportunities.map((item) => score(item, input)).sort((a, b) => b.matchScore - a.matchScore);
}
