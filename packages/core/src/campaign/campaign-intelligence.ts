// =============================================================================
// Campaign Intelligence helpers
// =============================================================================

export interface LeadIntelligence {
  score: number;
  requirement: string;
  service: 'SEO' | 'SOCIAL_MEDIA' | 'WEBSITE' | 'BRANDING' | 'ADS';
  strengths: string[];
  findings: string[];
}

export interface ResearchSnapshot {
  seo?: Record<string, unknown>;
  social?: Record<string, unknown>;
  technology?: { technologies?: string[] };
}

export interface SalesBrief {
  businessSummary: string;
  industry: string;
  location: string;
  website: string;
  websiteQuality: number;
  seoFindings: string[];
  socialFindings: string[];
  technology: string[];
  contact: { email?: string; phone?: string };
  growthOpportunities: string[];
  recommendedService: LeadIntelligence['service'];
  whyThisService: string;
  salesAngle: string;
  personalizedOpening: string;
  personalizationPoints: string[];
  likelyObjections: string[];
  objectionResponses: string[];
  nextAction: 'SEND_OUTREACH' | 'MANUAL_REVIEW' | 'RESEARCH_MORE';
}

export function buildPersonalizedPitch(input: {
  businessName: string;
  requirement: string;
  service: LeadIntelligence['service'];
  findings: string[];
  email?: boolean;
}): string {
  const observation = input.findings[0] ?? 'a few conversion opportunities';
  const channelIntro = input.email ? `Subject: A quick observation about ${input.businessName}\n\n` : '';

  return `${channelIntro}Hi ${input.businessName},\n\nI reviewed your website and noticed ${observation.toLowerCase()} ${input.requirement.toLowerCase()} may be worth looking at.\n\nBased on what I found, ${input.service} looks like the most relevant area to improve rather than taking a generic marketing approach.\n\nI put together a few specific observations for your business. Want me to send them over?\n\nBest,\nDev\nFounder • Nexor Media`;
}

export function buildSalesBrief(input: {
  businessName: string; niche: string; country: string; website: string; intelligence: LeadIntelligence;
  research: ResearchSnapshot; email?: string; phone?: string;
}): SalesBrief {
  const seoFindings = Object.values(input.research.seo ?? {}).flatMap((value) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : typeof value === 'string' ? [value] : []);
  const socialFindings = Object.entries(input.research.social ?? {}).filter(([, value]) => typeof value === 'string' && value).map(([platform]) => `${platform} profile detected.`);
  const technology = input.research.technology?.technologies ?? [];
  const opportunities = [...input.intelligence.findings, ...seoFindings].filter((item, index, arr) => item && arr.indexOf(item) === index).slice(0, 8);
  const summary = `${input.businessName} is a ${input.niche} business in ${input.country} with a publicly reachable website and evidence captured during automated research.`;
  const opening = input.intelligence.findings[0] ? `I reviewed ${input.businessName} and noticed ${input.intelligence.findings[0].toLowerCase()}` : `I reviewed ${input.businessName}'s online presence and found a few measurable growth opportunities.`;
  const contact: SalesBrief['contact'] = {
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
  };

  return {
    businessSummary: summary, industry: input.niche, location: input.country, website: input.website,
    websiteQuality: input.intelligence.score, seoFindings, socialFindings, technology, contact,
    growthOpportunities: opportunities, recommendedService: input.intelligence.service,
    whyThisService: `${input.intelligence.service} is recommended because the observed research signals point to ${input.intelligence.requirement.toLowerCase()}.`,
    salesAngle: `Lead with the verified observation, then offer a specific ${input.intelligence.service} improvement rather than a generic marketing pitch.`,
    personalizedOpening: opening, personalizationPoints: [input.intelligence.requirement, ...input.intelligence.findings.slice(0, 2)].filter(Boolean),
    likelyObjections: ['We already have someone handling this.', 'Send me the details first.', 'We are not looking to spend right now.'],
    objectionResponses: ['Offer a short independent audit and focus on the specific evidence already found.', 'Send the concise findings and one practical next step.', 'Start with the highest-impact low-risk improvement and let the prospect decide.'],
    nextAction: input.intelligence.score >= 60 && (input.phone || input.email) ? 'SEND_OUTREACH' : 'MANUAL_REVIEW',
  };
}
