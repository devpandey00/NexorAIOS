import { NextRequest, NextResponse } from 'next/server';
import { listTrends, upsertTrend } from '@/lib/social-intelligence';

export const runtime = 'nodejs';
export const maxDuration = 30;

const NEXOR_TERMS = ['google ads', 'meta ads', 'facebook ads', 'instagram', 'seo', 'local seo', 'lead generation', 'ai', 'automation', 'marketing', 'website', 'reels', 'content marketing', 'small business'];

function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? decode(match[1]) : '';
}

function score(topic: string) {
  const lower = topic.toLowerCase();
  return Math.min(100, 30 + NEXOR_TERMS.reduce((total, term) => total + (lower.includes(term) ? 12 : 0), 0));
}

function opportunity(topic: string) {
  const lower = topic.toLowerCase();
  if (lower.includes('ai') || lower.includes('automation')) return 'Create an AI/automation explainer with a concrete business use case and lead-generation CTA.';
  if (lower.includes('ads') || lower.includes('marketing')) return 'Turn the trend into a practical paid-media breakdown with a strong business-owner hook.';
  if (lower.includes('seo') || lower.includes('website')) return 'Create a before/after educational post showing the conversion or visibility opportunity.';
  return 'Use the trend as a timely hook for an original educational post aimed at business owners.';
}

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '50');
    return NextResponse.json({ success: true, trends: await listTrends(limit) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const geo = String(body.geo ?? 'IN').trim().toUpperCase().slice(0, 5) || 'IN';
    const feedUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`;
    const response = await fetch(feedUrl, { headers: { 'user-agent': 'NexorAIOS Trend Radar/1.0' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`Google Trends request failed (${response.status})`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => match[1]);
    const trends = [];
    for (const item of items.slice(0, 30)) {
      const topic = tag(item, 'title');
      const url = tag(item, 'ht:news_item_url') || tag(item, 'link');
      if (!topic || !url) continue;
      const published = tag(item, 'pubDate');
      const relevance = score(topic);
      trends.push(await upsertTrend({
        source: 'GOOGLE_TRENDS', url, platform: 'WEB', topic, category: 'TRENDING', relevance,
        contentOpportunity: opportunity(topic),
        creativeDirection: `Original Nexor concept inspired by the hook: ${topic}. Do not copy the source creative.`,
        sourcePublishedAt: published ? new Date(published).toISOString() : null,
      }));
    }
    return NextResponse.json({ success: true, source: 'GOOGLE_TRENDS', geo, fetched: trends.length, trends });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
