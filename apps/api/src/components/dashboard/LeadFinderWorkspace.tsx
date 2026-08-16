'use client';

import { FormEvent, useMemo, useState } from 'react';

interface DiscoveryQuery {
  industry: string;
  location: string;
  service: string;
  intent: string;
  query: string;
}

interface CampaignResponse {
  success: boolean;
  campaign?: { id: string; name: string; query: string };
  error?: string;
}

export default function LeadFinderWorkspace() {
  const [industry, setIndustry] = useState('dentists');
  const [location, setLocation] = useState('Dubai');
  const [service, setService] = useState('Google Ads');
  const [intent, setIntent] = useState('needs more leads');
  const [limit, setLimit] = useState(10);
  const [queries, setQueries] = useState<DiscoveryQuery[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedQuery = useMemo(
    () => queries.find((item) => item.query === selected) ?? queries[0],
    [queries, selected],
  );

  async function generateQueries(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/discovery/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industries: [industry], locations: [location], services: [service], intents: [intent], limit }),
      });
      const data = (await response.json()) as { success?: boolean; queries?: DiscoveryQuery[]; error?: string };
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Query generation failed');
      setQueries(data.queries ?? []);
      setSelected(data.queries?.[0]?.query ?? '');
      setMessage(`${data.queries?.length ?? 0} search intents generated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function runSearch() {
    if (!selectedQuery) return;
    setLoading(true);
    setError('');
    setMessage('Creating campaign and running discovery…');
    try {
      const createdResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedQuery.query, query: selectedQuery.query }),
      });
      const created = (await createdResponse.json()) as CampaignResponse;
      if (!createdResponse.ok || !created.success || !created.campaign?.id) {
        throw new Error(created.error ?? 'Campaign creation failed');
      }

      const runResponse = await fetch(`/api/campaigns/${created.campaign.id}/run`, { method: 'POST' });
      const result = (await runResponse.json()) as {
        success?: boolean;
        discovered?: number;
        processed?: number;
        qualified?: number;
        error?: string;
      };
      if (!runResponse.ok || !result.success) throw new Error(result.error ?? 'Lead discovery failed');

      setMessage(
        `Discovery complete: ${result.discovered ?? 0} found · ${result.processed ?? 0} processed · ${result.qualified ?? 0} qualified.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="nexor-panel p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">DISCOVERY CONTROL</div>
            <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Find the right businesses, not random contacts.</h2>
            <p className="mt-1 max-w-2xl text-[9px] leading-5 text-[var(--text-secondary)]">Generate query variations, choose one, then run the real campaign pipeline: discovery → research → scoring → requirement matching → personalised drafts.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-2 text-[8px] text-emerald-500">LIVE BACKEND</div>
        </div>

        <form onSubmit={generateQueries} className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-[8px] text-[var(--text-muted)]">INDUSTRY<input value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">LOCATION<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">SERVICE<input value={service} onChange={(e) => setService(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">INTENT<input value={intent} onChange={(e) => setIntent(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <label className="text-[8px] text-[var(--text-muted)]">VARIATIONS<input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value) || 1)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)] outline-none" /></label>
          <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-2">
            <button disabled={loading} type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-3 text-[9px] font-bold text-black disabled:opacity-50">{loading ? 'WORKING…' : 'GENERATE QUERIES'}</button>
            <button disabled={loading || !selectedQuery} type="button" onClick={runSearch} className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-[9px] font-bold text-[var(--accent)] disabled:opacity-50">RUN REAL DISCOVERY</button>
          </div>
        </form>

        {message && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-[9px] text-emerald-500">{message}</div>}
        {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-[9px] text-red-500">{error}</div>}
      </div>

      <div className="nexor-panel p-5">
        <div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-semibold text-[var(--text)]">Generated search intents</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Select a query to run through the actual campaign engine.</div></div><div className="font-mono text-[8px] text-[var(--text-muted)]">{queries.length} QUERIES</div></div>
        <div className="mt-4 grid gap-2">
          {queries.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[9px] text-[var(--text-muted)]">No generated queries yet.</div> : queries.map((item) => {
            const active = item.query === (selectedQuery?.query ?? selected);
            return <button key={item.query} type="button" onClick={() => setSelected(item.query)} className={`rounded-xl border px-4 py-3 text-left transition ${active ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/20'}`}>
              <div className="text-[9px] font-semibold text-[var(--text)]">{item.query}</div>
              <div className="mt-1 font-mono text-[7px] tracking-[0.1em] text-[var(--text-muted)]">{item.industry} · {item.location} · {item.service} · {item.intent}</div>
            </button>;
          })}
        </div>
      </div>
    </section>
  );
}
