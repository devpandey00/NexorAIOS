export function outreachPrompt(businessAnalysis: string, salesAnalysis: string) {
  return `
Business Analysis

${businessAnalysis}

Sales Analysis

${salesAnalysis}

Generate

- LinkedIn
- Email
- WhatsApp
- Cold Call
- Follow-ups

Return ONLY JSON.
`;
}
