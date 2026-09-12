'use client';

import { useEffect, useState } from 'react';

type Opportunity = {
  id: string;
  title: string;
  url: string;
  location: string | null;
  opportunityScore?: number;
  recommendedService?: string | null;
  requirement?: string | null;
  findings?: string[];
  salesAngle?: string | null;
  nextAction?: string | null;
  status: string;
};

export default function OpportunityHunterWorkspace() {
  const [industry, setIndustry] = useState('dentists');
  const [location, setLocation] = useState('Dubai');
  const [limit, setLimit] = useState(10);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await fetch('/api/opportunities?kind=COMPANY&limit=50', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.success) setOpportunities(data.opportunities ?? []);
    } catch {}
  }

  useEffect(() => { void load(); }, []);

  async function hunt() {
    setLoading(true); setError(''); setMessage('Hunting businesses → researching websites → scoring opportunities…');
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'COMPANY', industry, location, limit }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Opportunity Hunter failed');
      setOpportunities(data.opportunities ?? []);
      setMessage(`Hunter found ${data.count ?? 0} opportunities and ranked them by growth potential.`);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  const hot = opportunities.filter((item) => (item.opportunityScore ?? 0) >= 80).length;
  const qualified = opportunities.filter((item) => (item.opportunityScore ?? 0) >= 60).length;

  return (
    <section className="space-y-5">
      <div className="nexor-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXOR OPPORTUNITY HUNTER</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Find businesses that have a reason to buy.</h2>
            <p className="mt-1 max-w-2xl text-[9px] leading-5 text-[var(--text-secondary)]">Real web discovery → website research → growth-gap detection → 0–100 opportunity score → recommended Nexor service → sales angle.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"><div className="text-lg font-bold text-[var(--text)]">{opportunities.length}</div><div className="font-mono text-[6px] text-[var(--text-muted)]">PROSPECTS</div></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"><div className="text-lg font-bold text-[var(--accent)]">{hot}</div><div className="font-mono text-[6px] text-[var(--text-muted)]">HOT 80+</div></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"><div className="text-lg font-bold text-[var(--text)]">{qualified}</div><div className="font-mono text-[6px] text-[var(--text-muted)]">QUALIFIED</div></div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <label className="text-[8px] text-[var(--text-muted)]">INDUSTRY<input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">MARKET / LOCATION<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">TARGET<input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 1)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <button onClick={hunt} disabled={loading || !industry.trim() || !location.trim()} className="self-end rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black disabled:opacity-50">{loading ? 'HUNTING…' : 'HUNT OPPORTUNITIES'}</button>
        </div>
        {message && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-[9px] text-emerald-500">{message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-[9px] text-red-500">{error}</div>}
      </div>

      <div className="space-y-3">
        {opportunities.length === 0 ? <div className="nexor-panel p-10 text-center text-[9px] text-[var(--text-muted)]">No company opportunities yet. Run the Hunter to discover and research prospects.</div> : opportunities.map((item) => {
          const score = item.opportunityScore ?? 0;
          return <article key={item.id} className="nexor-panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[var(--text)]">{item.title}</h3><span className="rounded-full border border-[var(--border)] px-2 py-1 font-mono text-[6px] text-[var(--text-muted)]">{item.location ?? 'UNKNOWN MARKET'}</span></div>
                <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[8px] text-[var(--accent)]">{item.url}</a>
                {item.requirement && <div className="mt-3 text-[9px] text-[var(--text-secondary)]"><b>Need:</b> {item.requirement}</div>}
              </div>
              <div className="shrink-0 text-center"><div className="text-3xl font-black tracking-tight text-[var(--accent)]">{score}</div><div className="font-mono text-[6px] tracking-[0.15em] text-[var(--text-muted)]">OPPORTUNITY SCORE</div></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="font-mono text-[6px] text-[var(--text-muted)]">SELL THIS</div><div className="mt-1 text-[9px] font-semibold text-[var(--text)]">{item.recommendedService ?? 'Manual Review'}</div></div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="font-mono text-[6px] text-[var(--text-muted)]">NEXT ACTION</div><div className="mt-1 text-[9px] font-semibold text-[var(--text)]">{item.nextAction ?? 'MANUAL_REVIEW'}</div></div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><div className="font-mono text-[6px] text-[var(--text-muted)]">SALES ANGLE</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-secondary)]">{item.salesAngle ?? 'Lead with the verified growth gap.'}</div></div>
            </div>
            {item.findings?.length ? <div className="mt-4"><div className="font-mono text-[6px] tracking-[0.14em] text-[var(--text-muted)]">VERIFIED GROWTH GAPS</div><div className="mt-2 grid gap-2 md:grid-cols-2">{item.findings.map((finding, index) => <div key={`${item.id}-${index}`} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] text-[var(--text-secondary)]">• {finding}</div>)}</div></div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}
