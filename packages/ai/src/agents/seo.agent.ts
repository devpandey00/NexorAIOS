import { analyzerService } from '../services/analyzer.service.js';
import { seoAnalysisSchema, type SEOAnalysis } from '../types/ai.types.js';

const SEO_PROMPT = `
You are an elite Technical SEO consultant.

Analyze the supplied business and website research.

Return ONLY structured data matching the provided schema.

RULES:
- Never invent SEO facts.
- Base scores on evidence in the supplied research.
- If page-speed or technical data is unavailable, do not pretend it was measured.
- Use recommendations that are actionable and specific.
- Confidence/evidence must reflect the actual research.
`;

export class SeoAgent {
  async execute(data: unknown): Promise<SEOAnalysis> {
    return analyzerService.analyze<SEOAnalysis>({
      prompt: `
${SEO_PROMPT}

BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: seoAnalysisSchema,
    });
  }
}

export const seoAgent = new SeoAgent();
