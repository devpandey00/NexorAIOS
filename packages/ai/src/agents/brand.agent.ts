import { analyzerService } from '../services/analyzer.service.js';
import { brandAnalysisSchema, type BrandAnalysis } from '../types/ai.types.js';

const BRAND_PROMPT = `
You are a senior brand strategist.

Analyze the supplied business and website research.

Return ONLY structured data matching the provided schema.

RULES:
- Never invent brand facts.
- Base observations on the supplied research.
- Distinguish verified observations from inferences.
- Do not claim visual consistency unless visual/website evidence supports it.
- Identify positioning and trust gaps that could realistically affect conversion.
- Recommendations must be specific and actionable.
- Confidence must reflect the quality of the evidence.
`;

export class BrandAgent {
  async execute(data: unknown): Promise<BrandAnalysis> {
    return analyzerService.analyze<BrandAnalysis>({
      prompt: `
${BRAND_PROMPT}

BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: brandAnalysisSchema,
    });
  }
}

export const brandAgent = new BrandAgent();
