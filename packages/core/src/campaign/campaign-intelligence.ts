export interface ResearchSnapshot {
  website?: {
    title?: string;
    description?: string;
    h1?: string[];
    h2?: string[];
  };
  technology?: { technologies?: string[] };
  social?: Record<string, unknown>;
  seo?: Record<string, unknown>;
}

export interface LeadIntelligence {
  score: number;
  requirement: string;
  service: 'Website Development' | 'Google Ads' | 'Meta Ads' | 'SEO' | 'Social Media Marketing' | 'Conversion Optimization';
  strengths: string[];
  findings: string[];
}

export function assessLead(research: ResearchSnapshot): LeadIntelligence {
  const website = research.website ?? {};
  const technologies = research.technology?.technologies ?? [];
  const social = research.social ?? {};
  const findings: string[] = [];
  const strengths: string[] = [];
  let score = 50;

  if (website.title) strengths.push('The website has a page title.');
  else {
    findings.push('The website is missing a clear page title.');
    score -= 12;
  }

  if (website.description) strengths.push('The website has a meta description.');
  else {
    findings.push('The website is missing a meta description, which can weaken search presentation.');
    score -= 10;
  }

  if (website.h1?.length) strengths.push('The homepage has a visible H1 heading.');
  else {
    findings.push('The homepage does not expose a clear H1 heading.');
    score -= 8;
  }

  if (technologies.length) strengths.push(`Detected technology: ${technologies.slice(0, 4).join(', ')}.`);
  if (Object.values(social).some((value) => typeof value === 'string' && value)) {
    strengths.push('Social profiles were detected from the website.');
  } else {
    findings.push('No social profile links were detected from the website.');
    score -= 6;
  }

  const tech = technologies.join(' ').toLowerCase();
  let requirement: LeadIntelligence['requirement'] = 'Website conversion and lead generation improvement';
  let service: LeadIntelligence['service'] = 'Conversion Optimization';

  if (!website.title || !website.description || !website.h1?.length) {
    requirement = 'A stronger website foundation and conversion structure';
    service = 'Website Development';
  } else if (!tech.includes('google analytics') && !tech.includes('google tag manager')) {
    requirement = 'Better measurement and paid acquisition readiness';
    service = 'Google Ads';
  } else if (!Object.values(social).some((value) => typeof value === 'string' && value)) {
    requirement = 'Stronger social presence and content-led acquisition';
    service = 'Social Media Marketing';
  } else if (website.description && website.h1?.length) {
    requirement = 'More qualified traffic and stronger organic visibility';
    service = 'SEO';
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    requirement,
    service,
    strengths,
    findings,
  };
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
  const contact: SalesBrief['contact'] = {};
  if (input.email) contact.email = input.email;
  if (input.phone) contact.phone = input.phone;

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
