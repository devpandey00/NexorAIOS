import { z } from 'zod';

export const confidenceBasisSchema = z.enum(['verified', 'inferred', 'uncertain']);

export const findingSchema = z.object({
  finding: z.string(),
  basis: confidenceBasisSchema,
  evidence: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const businessIntelligenceSchema = z.object({
  company: z.string(),
  industry: z.string(),
  summary: z.string(),
  services: z.array(z.string()),
  targetAudience: z.string(),
  strengths: z.array(findingSchema),
  weaknesses: z.array(findingSchema),
  opportunities: z.array(findingSchema),
  risks: z.array(findingSchema),
  recommendedService: z.string(),
  confidence: z.number().min(0).max(1),
});

export const seoAnalysisSchema = z.object({
  seoScore: z.number().min(0).max(100),
  title: z.string(),
  metaDescription: z.string(),
  headingsScore: z.number().min(0).max(100),
  contentQuality: z.number().min(0).max(100),
  keywordOptimization: z.number().min(0).max(100),
  internalLinks: z.number().min(0).max(100),
  pageSpeed: z.number().min(0).max(100),
  mobileFriendly: z.boolean(),
  recommendations: z.array(findingSchema),
});

export const uxAnalysisSchema = z.object({
  uxScore: z.number().min(0).max(100),
  strengths: z.array(findingSchema),
  weaknesses: z.array(findingSchema),
  recommendations: z.array(findingSchema),
});

export const brandAnalysisSchema = z.object({
  brandScore: z.number().min(0).max(100),
  positioning: z.string(),
  brandVoice: z.string(),
  trustSignals: z.array(findingSchema),
  visualConsistency: z.number().min(0).max(100),
  recommendations: z.array(findingSchema),
});

export const technologyAnalysisSchema = z.object({
  cms: z.string(),
  frontend: z.string(),
  backend: z.string(),
  analytics: z.array(z.string()),
  marketingTools: z.array(z.string()),
  hosting: z.string(),
  recommendations: z.array(findingSchema),
});

export const competitorAnalysisSchema = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      domain: z.string().optional(),
      basis: confidenceBasisSchema,
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }),
  ),
  opportunities: z.array(findingSchema),
});

export const personalizedDraftsSchema = z.object({
  whatsapp: z.string(),
  email: z.string(),
  linkedin: z.string(),
  short: z.string(),
  medium: z.string(),
  long: z.string(),
});

export type BusinessIntelligence = z.infer<typeof businessIntelligenceSchema>;

export type SEOAnalysis = z.infer<typeof seoAnalysisSchema>;
export type UXAnalysis = z.infer<typeof uxAnalysisSchema>;
export type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;
export type TechnologyAnalysis = z.infer<typeof technologyAnalysisSchema>;
export type CompetitorAnalysis = z.infer<typeof competitorAnalysisSchema>;
export type PersonalizedDrafts = z.infer<typeof personalizedDraftsSchema>;
