import { NextRequest, NextResponse } from 'next/server';
import { ollamaAnalyze } from '@nexor/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Brief = {
  concept: string;
  format: 'STATIC' | 'CAROUSEL' | 'REEL' | 'STORY' | 'SHORT_VIDEO';
  hook: string;
  visualDirection: string;
  scenes: Array<{ scene: number; duration: string; visual: string; onScreenText: string; voiceover: string }>;
  caption: string;
  cta: string;
  hashtags: string[];
};

function fallback(input: { topic: string; platform: string; goal: string; audience: string }): Brief {
  return { concept: `Original ${input.platform} concept about ${input.topic}`, format: input.platform === 'INSTAGRAM' || input.platform === 'YOUTUBE' ? 'REEL' : 'CAROUSEL', hook: `${input.topic}: what most ${input.audience || 'business owners'} get wrong`, visualDirection: 'Premium Nexor aesthetic: high-contrast typography, restrained motion, clean UI-inspired layouts, strong hierarchy, original graphics only.', scenes: [{ scene: 1, duration: '0–3s', visual: 'Fast branded title reveal', onScreenText: input.topic, voiceover: input.topic }, { scene: 2, duration: '3–10s', visual: 'Show the problem with one concrete example', onScreenText: 'The problem', voiceover: 'Here is where most businesses lose attention or leads.' }, { scene: 3, duration: '10–20s', visual: 'Show the recommended process', onScreenText: 'The fix', voiceover: 'Use a focused process built around the business goal.' }, { scene: 4, duration: '20–25s', visual: 'Nexor CTA lockup', onScreenText: input.goal, voiceover: 'Turn attention into measurable growth.' }], caption: `A practical breakdown of ${input.topic} for ${input.audience || 'business owners'}. No fluff—just the part that affects growth.`, cta: input.goal || 'DM Nexor for a growth audit.', hashtags: ['#NexorMedia', '#DigitalMarketing', '#LeadGeneration', '#MarketingStrategy'] };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = String(body.topic ?? '').trim();
    const platform = String(body.platform ?? 'INSTAGRAM').trim().toUpperCase();
    const goal = String(body.goal ?? 'generate qualified leads').trim();
    const audience = String(body.audience ?? 'business owners').trim();
    if (!topic) throw new Error('topic is required');

    let brief = fallback({ topic, platform, goal, audience });
    let ai = false;
    let aiProvider = 'DETERMINISTIC';
    try {
      const raw = await ollamaAnalyze(`You are Nexor Media's senior creative director. Return ONLY valid JSON with keys concept, format, hook, visualDirection, scenes, caption, cta, hashtags. Topic: ${topic}. Platform: ${platform}. Goal: ${goal}. Audience: ${audience}. format must be STATIC, CAROUSEL, REEL, STORY, or SHORT_VIDEO. scenes must contain scene, duration, visual, onScreenText, voiceover. Make the concept original, premium, technology-focused and conversion-oriented. Do not invent statistics, clients, testimonials, results, or copyrighted creative. Hashtags must be an array.`);
      const parsed = JSON.parse(raw) as Partial<Brief>;
      if (typeof parsed.concept === 'string' && typeof parsed.hook === 'string' && Array.isArray(parsed.scenes)) {
        brief = { ...brief, ...parsed, format: ['STATIC', 'CAROUSEL', 'REEL', 'STORY', 'SHORT_VIDEO'].includes(String(parsed.format)) ? parsed.format as Brief['format'] : brief.format, scenes: parsed.scenes as Brief['scenes'], hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((x): x is string => typeof x === 'string').slice(0, 30) : brief.hashtags };
        ai = true;
        aiProvider = 'OLLAMA';
      }
    } catch {
      // Explicit deterministic fallback; response identifies that no AI provider was used.
    }
    return NextResponse.json({ success: true, ai, aiProvider, brief });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
