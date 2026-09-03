'use client';

import { useState } from 'react';

type Item = { lead?: Record<string, unknown>; score?: { data?: Record<string, unknown> }; crm?: { success?: boolean; data?: Record<string, unknown>; error?: string }; outreach?: { success?: boolean; data?: unknown; error?: string } };

type SalesResult = { success: boolean; error?: string; durationMs?: number; results?: { prospects?: { data?: { items?: Item[]; errors?: unknown[] } }; discover?: { data?: { totalDiscovered?: number; markets?: string[] } } } };

export default function SalesMachinePanel() {
  const [query, setQuery] = useState('high-intent digital marketing prospects');
  const [limit, setLimit] = useState(10);
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SalesResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/sales-machine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, limit, channel, createDrafts: true }) });
      const data = await response.json() as SalesResult;
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : String(error) });
    } finally { setRunning(false); }
  }

  const data = result?.results?.prospects?.data;
  const items = Array.isArray(data?.items) ? data.items : [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];

  return (
    <section className="nexor-panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">INTERNATIONAL SALES MACHINE</div><h2 className="mt-1 text-lg font-semibold text-[var(--text)]">USA → Australia → Canada → UAE</h2><p className="mt-1 text-[8px] text-[var(--text-muted)]">Find → Research → Score → CRM → Draft across the four target markets.</p></div><button disabled={running || !query.trim()} onClick={run} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{running ? 'RUNNING…' : 'RUN SALES MACHINE'}</button></div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_110px_130px]"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. high-intent dental businesses" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[9px] text-[var(--text)] outline-none" /><input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[9px] text-[var(--text)] outline-none" /><select value={channel} onChange={(e) => setChannel(e.target.value as 'WHATSAPP' | 'EMAIL')} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[9px] text-[var(--text)] outline-none"><option value="WHATSAPP">WhatsApp drafts</option><option value="EMAIL">Email drafts</option></select></div>
      {result && <div className="mt-5 space-y-3"><div className={['rounded-xl border p-3 text-[8px]', result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'].join(' ')}><span className="font-semibold">{result.success ? 'Pipeline completed' : 'Pipeline failed'}</span>{result.durationMs ? ` · ${result.durationMs}ms` : ''}{result.error ? ` · ${result.error}` : ''}</div><div className="grid grid-cols-3 gap-2"><Metric label="Processed" value={items.length} /><Metric label="Errors" value={errors.length} /><Metric label="Discovered" value={result.results?.discover?.data?.totalDiscovered ?? 0} /></div><div className="mb-2 text-[7px] font-mono tracking-[0.12em] text-[var(--text-muted)]">TARGET MARKETS: {(result.results?.discover?.data?.markets ?? ['USA', 'Australia', 'Canada', 'UAE']).join(' · ')}</div><div className="overflow-x-auto rounded-xl border border-[var(--border)]"><table className="w-full min-w-[700px] text-left text-[8px]"><thead className="bg-[var(--surface-2)] text-[var(--text-muted)]"><tr><th className="px-3 py-2">Prospect</th><th>Score</th><th>Qualification</th><th>CRM</th><th>Draft</th></tr></thead><tbody>{items.map((item, i) => { const score = item.score?.data?.score; const qualification = item.score?.data?.qualification; const crm = item.crm?.success; const draft = item.outreach?.success; return <tr key={i} className="border-t border-[var(--border)] text-[var(--text-secondary)]"><td className="px-3 py-2 font-semibold text-[var(--text)]">{String(item.lead?.name ?? 'Unknown')}</td><td>{String(score ?? '—')}</td><td>{String(qualification ?? '—')}</td><td>{crm ? '✓' : '—'}</td><td>{draft ? '✓' : '—'}</td></tr>; })}</tbody></table></div></div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="font-mono text-[6px] tracking-[0.14em] text-[var(--text-muted)]">{label}</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{String(value)}</div></div>; }
