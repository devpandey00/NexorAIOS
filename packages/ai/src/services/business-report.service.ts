import { analyzerService } from './analyzer.service.js';

const REPORT_PROMPT = `
You are NexorAIOS, an expert business growth and sales intelligence engine.

Analyze the supplied website research and return ONLY valid JSON.

Return exactly this structure:

{
  "business": {
    "company": "",
    "industry": "",
    "summary": "",
    "services": [],
    "targetAudience": "",
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "risks": [],
    "recommendedService": "",
    "confidence": 0
  },
  "seo": {
    "seoScore": 0,
    "issues": [],
    "opportunities": [],
    "recommendations": []
  },
  "ux": {
    "uxScore": 0,
    "issues": [],
    "opportunities": [],
    "recommendations": []
  },
  "competitor": {
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  },
  "brand": {
    "brandScore": 0,
    "strengths": [],
    "weaknesses": [],
    "recommendations": []
  },
  "technology": {
    "detected": [],
    "issues": [],
    "recommendations": []
  },
  "opportunityScore": 0,
  "recommendedService": "",
  "salesAngle": "",
  "personalizedMessage": ""
}

Rules:
- Scores must be integers from 0 to 100.
- opportunityScore represents the value of this lead for Nexor Media.
- recommendedService must be a realistic service Nexor Media can sell.
- personalizedMessage must be specific to this business.
- Do not invent facts.
- Keep personalizedMessage concise and natural.
- Return JSON only.

RESEARCH:
`;

export class BusinessReportService {
  async generate(input: unknown) {
    const prompt = `${REPORT_PROMPT}

${JSON.stringify(input, null, 2)}`;

    const report = await analyzerService.analyze<string>({
      prompt,
      model: 'gemini-3.6-flash',
    });

    let parsed: unknown;

    try {
      parsed = JSON.parse(report);
    } catch {
      throw new Error('AI returned invalid business report JSON.');
    }

    return {
      research: input,
      ...(parsed as Record<string, unknown>),
    };
  }
}

export const businessReportService = new BusinessReportService();
