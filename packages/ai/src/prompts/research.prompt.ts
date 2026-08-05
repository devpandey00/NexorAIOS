export function researchPrompt(research: string) {
  return `
Analyze this company research.

${research}

Return ONLY JSON.
`;
}
