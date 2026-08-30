'use client';

import { useEffect, useState } from 'react';

type Trend = { id: string; topic: string; source: string; relevance: number; contentOpportunity: string | null; creativeDirection: string | null; url: string };
type Learning = { platform: string; snapshots: number; avgEngagementRate: number; likes: number; comments: number; shares: number; saves: number; clicks: number; views: number };

type Brief = { concept: string; format: string; hook: string; visualDirection: string; scenes: Array<{ scene: number; duration: string; visual: string; onScreenText: string; voiceover: string }>; caption: string; cta: string; hashtags: string[] };

export default function SocialIntelligencePanel() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [learning, setLearning] = useState<Learning[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState('AI automation for local businesses');
  const [brief, setBrief] = useState<Brief | null>(null);

  async function load() {
    const [trendResponse, learningResponse] = await Promise.all([fetch('/api/social/trends?limit=12', { cache: 'no-store' }), fetch('/api/social/learning?limit=10', { cache: 'no-store' })]);
    const trendData = await trendResponse.json();
    const learningData = await learningResponse.json();
    if (trendData.success) setTrends(trendData.trends);
    if (learningData.success) setLearning(learningData.performance);
  }

  useEffect(() => { void load(); }, []);

  async function refreshTrends() {
    setBusy(true); setMessage('Fetching live Google Trends data…');
    try {
      const response = await fetch('/api/social/trends', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ geo: 'IN' }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Trend research failed');
      setTrends(data.trends); setMessage(`${data.fetched} real trend references stored.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Trend research failed'); }
    finally { setBusy(false); }
  }

  async function createBrief() {
    setBusy(true); setMessage('Building production brief…');
    try {
      const response = await fetch('/api/social/creative-brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ topic, platform: 'INSTAGRAM', goal: 'generate qualified leads', audience: 'business owners' }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Brief generation failed');
      setBrief(data.brief); setMessage(data.ai ? 'AI creative brief ready.' : 'Deterministic production brief ready.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Brief generation failed'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <section className="nexor-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">TREND RADAR</div><h2 className="mt-2 text-lg font-semibold text-[var(--text)]">Real trend intelligence</h2><p className="mt-1 text-[9px] text-[var(--text-muted)]">Fetches public Google Trends RSS data and stores source references. No fabricated trends.</p></div>
        <button onClick={refreshTrends} disabled={busy} className="rounded-xl bg-[var(--accent)] px-4 py-3 text-[8px] font-bold text-black disabled:opacity-50">{busy ? 'WORKING…' : 'REFRESH TRENDS'}</button>
      </div>
      {message && <div className="mt-3 text-[8px] text-[var(--text-muted)]">{message}</div>}
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{trends.map((trend) => <a key={trend.id} href={trend.url} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--accent)]/30"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[7px] text-[var(--accent)]">{trend.source}</span><span className="text-[7px] text-[var(--text-muted)]">REL {trend.relevance}</span></div><div className="mt-2 text-[10px] font-semibold text-[var(--text)]">{trend.topic}</div><div className="mt-2 text-[8px] leading-4 text-[var(--text-muted)]">{trend.contentOpportunity}</div></a>)}</div>
    </section>

    <section className="nexor-panel p-6">
      <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">PERFORMANCE LEARNING</div><h2 className="mt-2 text-lg font-semibold text-[var(--text)]">Recommendations from stored metrics</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{learning.map((item) => <div key={item.platform} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="font-mono text-[7px] text-[var(--accent)]">{item.platform}</div><div className="mt-2 text-xl font-semibold text-[var(--text)]">{item.avgEngagementRate.toFixed(2)}%</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">avg engagement · {item.snapshots} snapshots</div><div className="mt-2 text-[8px] text-[var(--text-secondary)]">Likes {item.likes.toLocaleString()} · Shares {item.shares.toLocaleString()} · Saves {item.saves.toLocaleString()}</div></div>)}{!learning.length && <div className="text-[9px] text-[var(--text-muted)]">No real analytics stored yet.</div>}</div>
    </section>

    <section className="nexor-panel p-6">
      <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">CREATIVE FACTORY</div><h2 className="mt-2 text-lg font-semibold text-[var(--text)]">Production-ready creative brief</h2>
      <div className="mt-4 flex gap-3"><input value={topic} onChange={(e) => setTopic(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[9px] text-[var(--text)]" /><button onClick={createBrief} disabled={busy} className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-[8px] font-bold text-[var(--accent)]">GENERATE BRIEF</button></div>
      {brief && <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5"><div className="font-mono text-[7px] text-[var(--accent)]">{brief.format}</div><h3 className="mt-2 text-sm font-semibold text-[var(--text)]">{brief.concept}</h3><div className="mt-3 text-[9px] text-[var(--text-secondary)]"><b>HOOK:</b> {brief.hook}</div><div className="mt-2 text-[9px] text-[var(--text-secondary)]"><b>VISUAL:</b> {brief.visualDirection}</div><div className="mt-4 space-y-2">{brief.scenes.map((scene) => <div key={scene.scene} className="rounded-lg border border-[var(--border)] p-3 text-[8px] text-[var(--text-secondary)]"><b>SCENE {scene.scene} · {scene.duration}</b> — {scene.visual}<br />TEXT: {scene.onScreenText}<br />VO: {scene.voiceover}</div>)}</div><div className="mt-4 text-[9px] text-[var(--text-secondary)]"><b>CTA:</b> {brief.cta}</div></div>}
    </section>
  </div>;
}
