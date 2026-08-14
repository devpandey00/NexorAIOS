import { researchAgent } from '../agents/research.agent.js';
import { businessIntelligenceAgent } from '../agents/business-intelligence.agent.js';
import { seoAgent } from '../agents/seo.agent.js';
import { uxAgent } from '../agents/ux.agent.js';
import { competitorAgent } from '../agents/competitor.agent.js';
import { brandAgent } from '../agents/brand.agent.js';
import { technologyAgent } from '../agents/technology.agent.js';
import { personalizationAgent } from '../agents/personalization.agent.js';

export class BusinessReportService {
  async generate(input: unknown) {
    // Research is the foundation for every downstream analysis.
    const research = await researchAgent.execute(input);

    // Independent analyses run in parallel.
    const [business, seo, ux, competitor, brand, technology] = await Promise.all([
      businessIntelligenceAgent.execute(research),
      seoAgent.execute(research),
      uxAgent.execute(research),
      competitorAgent.execute(research),
      brandAgent.execute(research),
      technologyAgent.execute(research),
    ]);

    // Personalization gets the complete intelligence picture,
    // rather than only raw website research.
    const drafts = await personalizationAgent.execute({
      research,
      business,
      seo,
      ux,
      competitor,
      brand,
      technology,
    });

    const opportunityScore = this.calculateOpportunityScore({
      business,
      seo,
      ux,
      brand,
      competitor,
      technology,
    });

    const recommendedService = this.getRecommendedService({
      business,
      seo,
      ux,
      brand,
      technology,
      opportunityScore,
    });

    return {
      research,
      business,
      seo,
      ux,
      competitor,
      brand,
      technology,
      opportunityScore,
      recommendedService,
      drafts,
    };
  }

  private calculateOpportunityScore(data: {
    business: {
      confidence: number;
      opportunities: unknown[];
      weaknesses: unknown[];
    };
    seo: {
      seoScore: number;
    };
    ux: {
      uxScore: number;
    };
    brand: {
      brandScore: number;
    };
    competitor: {
      opportunities: unknown[];
    };
    technology: {
      recommendations: unknown[];
    };
  }): number {
    const seoGap = 100 - data.seo.seoScore;
    const uxGap = 100 - data.ux.uxScore;
    const brandGap = 100 - data.brand.brandScore;

    const opportunitySignals =
      data.business.opportunities.length +
      data.business.weaknesses.length +
      data.competitor.opportunities.length +
      data.technology.recommendations.length;

    const signalScore = Math.min(opportunitySignals * 5, 25);

    const confidenceMultiplier = 0.75 + data.business.confidence * 0.25;

    const rawScore =
      seoGap * 0.25 + uxGap * 0.25 + brandGap * 0.2 + signalScore + data.business.confidence * 5;

    return Math.round(Math.max(0, Math.min(100, rawScore * confidenceMultiplier)));
  }

  private getRecommendedService(data: {
    business: {
      recommendedService: string;
    };
    seo: {
      seoScore: number;
    };
    ux: {
      uxScore: number;
    };
    brand: {
      brandScore: number;
    };
    technology: {
      recommendations: unknown[];
    };
    opportunityScore: number;
  }): string {
    if (data.seo.seoScore < 55) {
      return 'SEO';
    }

    if (data.ux.uxScore < 55) {
      return 'Website & Conversion Optimization';
    }

    if (data.brand.brandScore < 55) {
      return 'Branding & Creative Strategy';
    }

    if (data.technology.recommendations.length > 2) {
      return 'Website Development & Marketing Technology';
    }

    if (data.business.recommendedService.trim()) {
      return data.business.recommendedService;
    }

    if (data.opportunityScore >= 60) {
      return 'Digital Marketing & Lead Generation';
    }

    return 'Digital Growth Consultation';
  }
}

export const businessReportService = new BusinessReportService();
