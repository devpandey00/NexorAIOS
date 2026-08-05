export interface SEOResult {
  score: number;
  issues: string[];
}

export function calculateSEO(data: {
  title: string;
  description: string;
  h1: string[];
}): SEOResult {
  let score = 100;

  const issues: string[] = [];

  if (!data.title) {
    score -= 20;
    issues.push('Missing page title');
  }

  if (!data.description) {
    score -= 20;
    issues.push('Missing meta description');
  }

  if (data.h1.length === 0) {
    score -= 20;
    issues.push('No H1 heading found');
  }

  if (data.title.length > 60) {
    score -= 5;
    issues.push('Title too long');
  }

  if (data.description.length > 160 && data.description.length !== 0) {
    score -= 5;
    issues.push('Meta description too long');
  }

  return {
    score: Math.max(score, 0),
    issues,
  };
}
