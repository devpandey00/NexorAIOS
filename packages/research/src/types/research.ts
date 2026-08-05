export interface CompanyInfo {
  name: string;
  website: string;
  niche: string;
  country: string;
}

export interface WebsiteAudit {
  score: number;
  speed: number;
  mobileFriendly: boolean;
  ssl: boolean;
}

export interface SEOAudit {
  score: number;
  title: string;
  description: string;
  headings: number;
}

export interface SocialProfiles {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
}

export interface TechStack {
  cms?: string;
  framework?: string;
  analytics?: string[];
}

export interface AIRecommendation {
  opportunityScore: number;
  recommendedServices: string[];
  summary: string;
}

export interface ResearchResult {
  company: CompanyInfo;
  website: WebsiteAudit;
  seo: SEOAudit;
  social: SocialProfiles;
  technology: TechStack;
  recommendation: AIRecommendation;
}
