import { analyzerService } from '../services/analyzer.service.js';
import { technologyAnalysisSchema, type TechnologyAnalysis } from '../types/ai.types.js';

const TECHNOLOGY_PROMPT = `
You are a senior web technology and marketing-stack analyst.

Analyze the supplied business and website research.

Return ONLY structured data matching the provided schema.

RULES:
- Never invent technologies.
- Only identify a CMS, frontend, backend, analytics platform, marketing tool, or hosting provider when supported by the supplied research.
- If technology cannot be verified, use an empty string or empty array.
- Do not claim a technology was detected merely because it is common.
- Recommendations must be based on actual detected gaps or opportunities.
`;

export class TechnologyAgent {
  async execute(data: unknown): Promise<TechnologyAnalysis> {
    return analyzerService.analyze<TechnologyAnalysis>({
      prompt: `
${TECHNOLOGY_PROMPT}

WEBSITE / BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: technologyAnalysisSchema,
    });
  }
}

export const technologyAgent = new TechnologyAgent();
