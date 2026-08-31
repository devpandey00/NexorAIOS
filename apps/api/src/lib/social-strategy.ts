import { createHash } from 'node:crypto';
import { getDatabaseClients } from '@nexor/database';
import { ollamaAnalyze } from '@nexor/ai';

export type SocialStrategy = {
  opportunity: string;
  pillar: string;
  audience: string;
  objective: string;
  format: 'STATIC' | 'CAROUSEL' | 'REEL' | 'STORY' | 'SHORT_VIDEO';
  angle: string;
  hook: string;
  keyMessage: string;
  cta: string;
  platform: string;
  postingWindow: string;
  creativeDirection: string;
  ideas: Array<{ title: string; hook: string; angle: string; format: string; cta: string }>;
};

export type StrategyInput = {
  trendId?: string | null;
  trendTopic?: string | null;
  trendOpportunity?: string | null;
  platform: string;
  niche: string;
  goal: string;
  audience: string;
  offer?: string | null;
};

const PILLARS = ['Education', 'Authority', 'Case Studies', 'Problem/Solution', 'AI & Automation', 'Marketing Tips', 'Before/After', 'Industry Insights', 'Founder/Behind the Scenes', 'Offers', 'Social Proof', 'Lead Generation'];

function fingerprint(input: StrategyInput) {
  return createHash('sha256').update(JSON.stringify({ ...input, platform: input.platform.toUpperCase() })).digest('hex');
}

function fallback(input: StrategyInput): SocialStrategy {
  const topic = input.trendTopic?.trim() || input.niche;
  const offer = input.offer?.trim() || 'digital marketing, lead generation and automation';
  const pillar = /AI|automation/i.test(topic) ? 'AI & Automation' : /case|result|before/i.test(topic) ? 'Case Studies' : 'Education';
  const format = input.platform.toUpperCase() === 'LINKEDIN' ? 'CAROUSEL' : input.platform.toUpperCase() === 'YOUTUBE' ? 'SHORT_VIDEO' : 'REEL';
  return {
    opportunity: input.trendOpportunity?.trim() || `Turn ${topic} into a practical ${input.goal} content opportunity.`,
    pillar,
    audience: input.audience,
    objective: input.goal,
    format,
    angle: `Show ${topic} through a practical business-growth lens without unsupported claims.`,
    hook: `${topic}: the practical part most ${input.audience || 'business owners'} miss`,
    keyMessage: `Use a focused process around ${topic} and connect it directly to ${input.goal}.`,
    cta: `DM Nexor to discuss ${offer}.`,
    platform: input.platform.toUpperCase(),
    postingWindow: 'Test audience-local weekday lunch and evening windows; optimize after real analytics accumulate.',
    creativeDirection: 'Premium Nexor visual system, strong typography, restrained motion, original graphics, one clear CTA.',
    ideas: [
      { title: `3 mistakes with ${topic}`, hook: `Stop doing these three things with ${topic}.`, angle: 'Problem/Solution', format, cta: 'Save this and DM Nexor for an audit.' },
      { title: `${topic} explained simply`, hook: `If ${topic} feels complicated, start here.`, angle: 'Education', format, cta: 'Follow for practical growth systems.' },
      { title: `${topic} → ${input.goal}`, hook: `Here is how to connect ${topic} to a measurable business goal.`, angle: 'Lead Generation', format, cta: 'DM Nexor to map the next step.' },
    ],
  };
}

function normalize(raw: string, input: StrategyInput): SocialStrategy {
  const parsed = JSON.parse(raw) as Partial<SocialStrategy>;
  const base = fallback(input);
  const allowed = ['STATIC', 'CAROUSEL', 'REEL', 'STORY', 'SHORT_VIDEO'] as const;
  return {
    ...base,
    ...parsed,
    format: allowed.includes(parsed.format as typeof allowed[number]) ? parsed.format as SocialStrategy['format'] : base.format,
    pillar: typeof parsed.pillar === 'string' && PILLARS.includes(parsed.pillar) ? parsed.pillar : base.pillar,
    ideas: Array.isArray(parsed.ideas) ? parsed.ideas.filter((x): x is { title: string; hook: string; angle: string; format: string; cta: string } => !!x && typeof x === 'object' && typeof x.title === 'string' && typeof x.hook === 'string' && typeof x.angle === 'string' && typeof x.format === 'string' && typeof x.cta === 'string').slice(0, 10) : base.ideas,
  };
}

export async function generateSocialStrategy(input: StrategyInput) {
  if (!input.platform.trim() || !input.niche.trim() || !input.goal.trim() || !input.audience.trim()) throw new Error('platform, niche, goal and audience are required');
  const db = getDatabaseClients().write;
  const key = fingerprint(input);
  const existing = await db.$queryRaw<Array<{ id: string; strategy: unknown }>>`
    SELECT id, strategy FROM public.social_content_strategies WHERE fingerprint = ${key} LIMIT 1`;
  if (existing[0]) return { id: existing[0].id, strategy: existing[0].strategy as SocialStrategy, ai: false, cached: true };

  let strategy = fallback(input);
  let ai = false;
  try {
    const raw = await ollamaAnalyze(`You are Nexor Media's senior social strategist. Return ONLY valid JSON matching this shape: {"opportunity":string,"pillar":string,"audience":string,"objective":string,"format":"STATIC|CAROUSEL|REEL|STORY|SHORT_VIDEO","angle":string,"hook":string,"keyMessage":string,"cta":string,"platform":string,"postingWindow":string,"creativeDirection":string,"ideas":[{"title":string,"hook":string,"angle":string,"format":string,"cta":string}]}. Use only these pillars: ${PILLARS.join(', ')}. Business: Nexor Media. Platform: ${input.platform}. Niche: ${input.niche}. Goal: ${input.goal}. Audience: ${input.audience}. Offer: ${input.offer || 'digital marketing and growth services'}. Trend: ${input.trendTopic || 'none supplied'}. Opportunity: ${input.trendOpportunity || 'derive a useful opportunity'}. Never invent statistics, clients, testimonials or results.`);
    strategy = normalize(raw, input);
    ai = true;
  } catch {
    // Deterministic strategy is explicitly reported as non-AI output.
  }

  const rows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO public.social_content_strategies (fingerprint, trend_id, platform, niche, goal, audience, offer, strategy)
    VALUES (${key}, ${input.trendId || null}::uuid, ${input.platform.toUpperCase()}, ${input.niche}, ${input.goal}, ${input.audience}, ${input.offer || null}, ${JSON.stringify(strategy)}::jsonb)
    ON CONFLICT (fingerprint) DO UPDATE SET strategy = EXCLUDED.strategy, updated_at = CURRENT_TIMESTAMP
    RETURNING id`;
  if (!rows[0]) throw new Error('Failed to persist social strategy');
  return { id: rows[0].id, strategy, ai, cached: false };
}

export async function listSocialStrategies(limit = 50) {
  const db = getDatabaseClients().write;
  return db.$queryRaw<Array<{ id: string; platform: string; niche: string; goal: string; audience: string; offer: string | null; strategy: SocialStrategy; createdAt: string }>>`
    SELECT id, platform, niche, goal, audience, offer, strategy, created_at AS "createdAt"
    FROM public.social_content_strategies ORDER BY created_at DESC LIMIT ${Math.min(Math.max(limit, 1), 100)}`;
}
