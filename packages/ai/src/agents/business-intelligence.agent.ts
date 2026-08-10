import { analyzerService } from '../services/analyzer.service.js';
import { businessIntelligenceSchema, type BusinessIntelligence } from '../types/ai.types.js';

const PROMPT = `
You are NexorAIOS Business Intelligence Engine.

Analyze the supplied business research.

Return ONLY the requested structured data.

RULES:
- Never invent facts.
- Only mark something "verified" when the supplied research supports it.
- Use "inferred" for reasonable conclusions.
- Use "uncertain" when evidence is insufficient.
- Every finding must include evidence when available.
- Confidence must be between 0 and 1.
- recommendedService must be based on the strongest verified opportunity.
`;

export class BusinessIntelligenceAgent {
  async execute(data: unknown): Promise<BusinessIntelligence> {
    return analyzerService.analyze<BusinessIntelligence>({
      prompt: `
${PROMPT}

BUSINESS RESEARCH:
${JSON.stringify(data, null, 2)}
`,
      schema: businessIntelligenceSchema,
    });
  }
}

export const businessIntelligenceAgent = new BusinessIntelligenceAgent();
