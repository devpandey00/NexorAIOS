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
