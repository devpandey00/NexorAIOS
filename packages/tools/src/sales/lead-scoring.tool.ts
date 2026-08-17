import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';

function clamp(value: number) { return Math.max(0, Math.min(100, Math.round(value))); }

function bool(input: unknown) { return input === true || input === 'true' || input === 1 || input === '1'; }

export const leadScoringTool: Tool = {
  id: 'lead_scoring',
  name: 'Lead Scoring',
  description: 'Score a prospect from 0-100 using website, contactability, social and marketing opportunity signals.',
  category: 'sales',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const research = (input.research && typeof input.research === 'object' ? input.research : input) as Record<string, unknown>;
    const lead = (input.lead && typeof input.lead === 'object' ? input.lead : input) as Record<string, unknown>;
    const website = typeof lead.website === 'string' && lead.website.length > 0;
    const email = typeof lead.email === 'string' && lead.email.length > 0;
    const whatsapp = typeof lead.whatsapp === 'string' && lead.whatsapp.length > 0;
    const instagram = typeof lead.instagram === 'string' && lead.instagram.length > 0;
    const linkedin = typeof lead.linkedin === 'string' && lead.linkedin.length > 0;

    const factors = {
      businessFit: Number(input.businessFit ?? 15),
      websiteOpportunity: website ? Number(input.websiteOpportunity ?? (bool(research.mobilePoor) || bool(research.seoWeak) ? 18 : 10)) : 20,
      contactability: (email ? 5 : 0) + (whatsapp ? 5 : 0),
      socialPresence: (instagram ? 3 : 0) + (linkedin ? 2 : 0),
      growthSignals: Number(input.growthSignals ?? 10),
      marketingOpportunity: Number(input.marketingOpportunity ?? (bool(research.adsWeak) || bool(research.seoWeak) ? 20 : 12)),
    };
    const score = clamp(Object.values(factors).reduce((a, b) => a + b, 0));
    const qualification = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
    const recommendedServices = [
      ...(bool(research.seoWeak) ? ['SEO / Local SEO'] : []),
      ...(bool(research.adsWeak) ? ['Google Ads / Meta Ads'] : []),
      ...(bool(research.socialWeak) ? ['Social Media Management'] : []),
      ...(bool(research.conversionWeak) ? ['Website / Landing Page'] : []),
    ];
    if (!recommendedServices.length) recommendedServices.push('Digital Marketing Audit');

    return {
      success: true,
      data: {
        score,
        qualification,
        factors,
        recommendedServices,
        rationale: `${qualification} priority prospect with a ${score}/100 sales opportunity score based on fit, contactability, digital presence and visible marketing opportunity.`,
      },
    };
  },
};
