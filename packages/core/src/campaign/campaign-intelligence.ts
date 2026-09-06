export interface ResearchSnapshot {
  website?: {
    title?: string;
    description?: string;
    h1?: string[];
    h2?: string[];
  };
  technology?: { technologies?: string[] };
  social?: object;
  seo?: object;
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
  let score = 70;

  if (website.title) strengths.push('The website has a page title.');
  else {
    findings.push('The website is missing a clear page title.');
    score -= 8;
  }
  if (website.description) strengths.push('The website has a meta description.');
  else {
    findings.push('The website is missing a meta description, which can weaken search presentation.');
    score -= 8;
  }
  if (website.h1?.length) strengths.push('The homepage has a visible H1 heading.');
  else {
    findings.push('The homepage does not expose a clear H1 heading.');
    score -= 7;
  }
  if (technologies.length) strengths.push(`Detected technology: ${technologies.slice(0, 4).join(', ')}.`);

  const socialPlatforms = Object.entries(social)
    .filter(([, value]) => typeof value === 'string' && value)
    .map(([platform]) => platform.toUpperCase());
  if (socialPlatforms.length) strengths.push(`Social presence detected on ${socialPlatforms.length} platform${socialPlatforms.length === 1 ? '' : 's'}: ${socialPlatforms.slice(0, 5).join(', ')}.`);
  else {
    findings.push('No social profile links were detected from the website.');
    score -= 5;
  }

  const tech = technologies.join(' ').toLowerCase();
  let requirement: LeadIntelligence['requirement'] = 'Website conversion and lead generation improvement';
  let service: LeadIntelligence['service'] = 'Conversion Optimization';

  if (!website.title || !website.description || !website.h1?.length) {
    requirement = 'A stronger website foundation and conversion structure';
    service = 'Website Development';
    findings.unshift('The current website foundation has clear gaps that can affect trust and conversion.');
  } else if (!tech.includes('google analytics') && !tech.includes('google tag manager')) {
    requirement = 'Better measurement and paid acquisition readiness';
    service = 'Google Ads';
    findings.unshift('The site does not expose Google Analytics or Google Tag Manager, so paid acquisition measurement should be strengthened.');
  } else if (!socialPlatforms.length) {
    requirement = 'Stronger social presence and content-led acquisition';
    service = 'Social Media Marketing';
    findings.unshift('The website does not expose active social profiles, indicating a weak visible social presence.');
  } else if (website.description && website.h1?.length) {
    requirement = 'More qualified traffic and stronger organic visibility';
    service = 'SEO';
    findings.unshift('The website has a usable foundation, so the next opportunity is qualified organic traffic and visibility.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    requirement,
    service,
    strengths,
    findings: findings.slice(0, 6),
  };
}

export function buildPersonalizedPitch(input: {
  businessName: string;
  requirement: string;
  service: LeadIntelligence['service'];
  findings: string[];
  email?: boolean;
}): string {
  const observation = input.findings[0] ?? input.requirement;
  const channelIntro = input.email ? `Subject: A quick observation about ${input.businessName}\n\n` : '';
  return `${channelIntro}Hi ${input.businessName},\n\nI reviewed your online presence and noticed ${observation.toLowerCase()}\n\nThat points to ${input.requirement.toLowerCase()}. Based on the research, ${input.service} looks like the most relevant area for your business right now rather than a generic marketing package.\n\nI put together a few specific observations for ${input.businessName}. Want me to send them over?\n\nBest,\nDev\nFounder • Nexor Media`;
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
  const summary = `${input.businessName} is a ${input.niche} business in ${input.country} with research evidence captured during automated online analysis.`;
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
