import { NextRequest, NextResponse } from 'next/server';
import { createSocialContent, type SocialContentPlatform } from '@/lib/social-content';
import { ollamaAnalyze } from '@nexor/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const PLATFORMS: SocialContentPlatform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];

interface GeneratedContent { title: string; caption: string; hashtags: string[]; }

function fallbackContent(input: { niche: string; platform: SocialContentPlatform; goal: string; offer: string; audience: string }): GeneratedContent {
  const title = `${input.niche}: ${input.goal}`;
  const caption = [`Your ${input.niche.toLowerCase()} business should not rely on guesswork to grow online.`, input.offer ? `Our focus: ${input.offer}.` : '', input.audience ? `Built for ${input.audience}.` : '', 'Follow for practical growth ideas you can actually use.'].filter(Boolean).join('\n\n');
  const nicheTag = input.niche.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return { title, caption, hashtags: ['#DigitalMarketing', '#LeadGeneration', nicheTag ? `#${nicheTag}` : '#NexorMedia'] };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const platform = String(body.platform ?? 'INSTAGRAM').toUpperCase() as SocialContentPlatform;
    const niche = String(body.niche ?? '').trim();
    const goal = String(body.goal ?? 'grow online').trim();
    const offer = String(body.offer ?? '').trim();
    const audience = String(body.audience ?? '').trim();
    const tone = String(body.tone ?? 'premium, confident, practical').trim();
    if (!PLATFORMS.includes(platform)) throw new Error('Invalid social platform');
    if (!niche) throw new Error('niche is required');

    let generated = fallbackContent({ niche, platform, goal, offer, audience });
    let aiUsed = false;
    let aiProvider = 'DETERMINISTIC';
    try {
      const raw = await ollamaAnalyze(`You are Nexor Media's senior social copywriter. Return ONLY valid JSON with keys title, caption, hashtags. Platform: ${platform}. Niche: ${niche}. Goal: ${goal}. Offer: ${offer || 'digital marketing services'}. Audience: ${audience || 'business owners'}. Tone: ${tone}. Write original, useful, concise copy with one clear CTA. Do not invent statistics, clients, testimonials, guarantees, or results. Hashtags must be an array of strings.`);
      const parsed = JSON.parse(raw) as Partial<GeneratedContent>;
      if (typeof parsed.title === 'string' && typeof parsed.caption === 'string' && Array.isArray(parsed.hashtags)) {
        generated = { title: parsed.title.trim(), caption: parsed.caption.trim(), hashtags: parsed.hashtags.filter((value): value is string => typeof value === 'string').slice(0, 30) };
        aiUsed = true;
        aiProvider = 'OLLAMA';
      }
    } catch {
      // Explicit deterministic fallback; response identifies that no AI provider was used.
    }

    const post = await createSocialContent({ platform, status: 'DRAFT', title: generated.title, caption: generated.caption, hashtags: generated.hashtags });
    return NextResponse.json({ success: true, ai: aiUsed, aiProvider, post });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
