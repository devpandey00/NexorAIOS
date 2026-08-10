import { analyzerService } from '../services/analyzer.service.js';
import { uxAnalysisSchema, type UXAnalysis } from '../types/ai.types.js';

const UX_PROMPT = `
You are an elite conversion-focused UX consultant.

Analyze the supplied business and website research.

Return ONLY structured data matching the provided schema.

RULES:
- Never invent UX observations.
- Base findings on supplied evidence.
- Distinguish verified observations from reasonable inferences.
- Do not claim to have performed tests that were not provided.
- Recommendations must be specific, actionable, and commercially relevant.
- Keep confidence proportional to the available evidence.
`;

export class UxAgent {
  async execute(data: unknown): Promise<UXAnalysis> {
    return analyzerService.analyze<UXAnalysis>({
      prompt: `
${UX_PROMPT}

BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: uxAnalysisSchema,
    });
  }
}

export const uxAgent = new UxAgent();
