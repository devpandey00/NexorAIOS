import { analyzerService } from '../services/analyzer.service.js';
import { competitorAnalysisSchema, type CompetitorAnalysis } from '../types/ai.types.js';

const COMPETITOR_PROMPT = `
You are a senior competitive intelligence strategist.

Analyze the supplied business and website research.

Return ONLY structured data matching the provided schema.

RULES:
- Never invent competitors.
- Only identify a competitor when the supplied research provides enough evidence.
- Clearly distinguish verified competitors from inferred competitors.
- Do not invent competitor domains, strengths, weaknesses, rankings, traffic, revenue, or market share.
- If competitor evidence is insufficient, return an empty competitors array.
- Opportunities must be directly connected to the evidence.
- Confidence must reflect the quality of the available evidence.
`;

export class CompetitorAgent {
  async execute(data: unknown): Promise<CompetitorAnalysis> {
    return analyzerService.analyze<CompetitorAnalysis>({
      prompt: `
${COMPETITOR_PROMPT}

BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: competitorAnalysisSchema,
    });
  }
}

export const competitorAgent = new CompetitorAgent();
