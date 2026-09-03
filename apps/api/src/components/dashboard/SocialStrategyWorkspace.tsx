'use client';

import { useEffect, useState } from 'react';

type Idea = { title: string; hook: string; angle: string; format: string; cta: string };
type Strategy = { opportunity: string; pillar: string; audience: string; objective: string; format: string; angle: string; hook: string; keyMessage: string; cta: string; platform: string; targetMarket?: string; postingWindow: string; creativeDirection: string; ideas: Idea[] };
type Row = { id: string; platform: string; niche: string; goal: string; audience: string; offer: string | null; strategy: Strategy; createdAt: string };

const TARGET_MARKETS = ['USA', 'Australia', 'Canada', 'UAE'];

export default function SocialStrategyWorkspace() {
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [targetMarket, setTargetMarket] = useState('USA');
  const [niche, setNiche] = useState('digital marketing');
  const [goal, setGoal] = useState('generate qualified leads');
  const [audience, setAudience] = useState('business owners');
  const [offer, setOffer] = useState('Google Ads, Meta Ads, SEO and websites');
  const [trendTopic, setTrendTopic] = useState('');
  const [trendOpportunity, setTrendOpportunity] = useState('');
  const [result, setResult] = useState<{ strategy: Strategy; ai: boolean; cached: boolean } | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/social/strategy?limit=20', { cache: 'no-store' });
    const data = await response.json();
    if (data.success) setHistory(data.strategies);
  }
  useEffect(() => { void load(); }, []);

  async function generate() {
    setBusy(true); setMessage('Building strategy…');
    try {
      const response = await fetch('/api/social/strategy', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ platform, targetMarket, niche, goal, audience, offer, trendTopic, trendOpportunity }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Strategy generation failed');
      setResult({ strategy: data.strategy, ai: data.ai, cached: data.cached });
      setMessage(data.cached ? 'Loaded existing strategy.' : data.ai ? 'Ollama strategy generated.' : 'Deterministic fallback generated; Ollama was unavailable.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Strategy generation failed'); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <section className="nexor-panel p-6">
      <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">INTERNATIONAL CONTENT STRATEGY ENGINE</div>
      <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">USA → Australia → Canada → UAE</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="text-[8px] font-mono text-[var(--text-muted)]">TARGET MARKET<select value={targetMarket} onChange={e => setTargetMarket(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]">{TARGET_MARKETS.map(market => <option key={market}>{market}</option>)}</select></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">PLATFORM<select value={platform} onChange={e => setPlatform(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]"><option>INSTAGRAM</option><option>FACEBOOK</option><option>LINKEDIN</option><option>YOUTUBE</option></select></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">NICHE<input value={niche} onChange={e => setNiche(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">GOAL<input value={goal} onChange={e => setGoal(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">AUDIENCE<input value={audience} onChange={e => setAudience(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">OFFER<input value={offer} onChange={e => setOffer(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
        <label className="text-[8px] font-mono text-[var(--text-muted)]">TREND TOPIC<input value={trendTopic} onChange={e => setTrendTopic(e.target.value)} placeholder="Optional" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
      </div>
      <div className="mt-3"><label className="text-[8px] font-mono text-[var(--text-muted)]">TREND OPPORTUNITY<textarea value={trendOpportunity} onChange={e => setTrendOpportunity(e.target.value)} placeholder="Optional" rows={2} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={generate} disabled={busy} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black disabled:opacity-50">{busy ? 'BUILDING…' : 'BUILD STRATEGY'}</button>{message && <span className="text-[9px] text-[var(--text-muted)]">{message}</span>}</div>
    </section>

    {result && <section className="nexor-panel p-6"><div className="flex items-center justify-between"><div><div className="font-mono text-[7px] text-[var(--accent)]">{result.strategy.targetMarket ?? targetMarket} · {result.strategy.platform} · {result.strategy.pillar}</div><h3 className="mt-2 text-base font-semibold text-[var(--text)]">{result.strategy.opportunity}</h3></div><span className="rounded-full border border-[var(--border)] px-3 py-1 text-[7px] font-mono text-[var(--text-muted)]">{result.ai ? 'OLLAMA' : result.cached ? 'CACHE' : 'DETERMINISTIC'}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-[var(--border)] p-4 text-[9px] text-[var(--text-secondary)]"><b>HOOK</b><div className="mt-1">{result.strategy.hook}</div></div><div className="rounded-xl border border-[var(--border)] p-4 text-[9px] text-[var(--text-secondary)]"><b>KEY MESSAGE</b><div className="mt-1">{result.strategy.keyMessage}</div></div><div className="rounded-xl border border-[var(--border)] p-4 text-[9px] text-[var(--text-secondary)]"><b>FORMAT</b><div className="mt-1">{result.strategy.format}</div></div><div className="rounded-xl border border-[var(--border)] p-4 text-[9px] text-[var(--text-secondary)]"><b>POSTING WINDOW</b><div className="mt-1">{result.strategy.postingWindow}</div></div></div><div className="mt-4 text-[9px] text-[var(--text-secondary)]"><b>CREATIVE DIRECTION:</b> {result.strategy.creativeDirection}</div><div className="mt-4 grid gap-3 md:grid-cols-3">{result.strategy.ideas.map((idea, i) => <article key={`${idea.title}-${i}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="font-mono text-[7px] text-[var(--accent)]">IDEA {i + 1}</div><h4 className="mt-2 text-[10px] font-semibold text-[var(--text)]">{idea.title}</h4><p className="mt-2 text-[8px] text-[var(--text-muted)]">{idea.hook}</p><p className="mt-2 text-[8px] text-[var(--text-secondary)]">{idea.angle} · {idea.format}</p><p className="mt-2 text-[8px] text-[var(--text-secondary)]">{idea.cta}</p></article>)}</div></section>}

    <section className="space-y-3">{history.map(row => <article key={row.id} className="nexor-panel p-4"><div className="font-mono text-[7px] text-[var(--accent)]">{row.strategy.targetMarket ?? 'INTERNATIONAL'} · {row.platform} · {row.niche} · {row.goal}</div><div className="mt-2 text-[10px] font-semibold text-[var(--text)]">{row.strategy.opportunity}</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{row.strategy.pillar} · {new Date(row.createdAt).toLocaleString()}</div></article>)}</section>
  </div>;
}
