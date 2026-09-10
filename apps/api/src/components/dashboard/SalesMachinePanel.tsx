'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

type Item = { lead?: Record<string, unknown>; score?: { data?: Record<string, unknown> }; crm?: { success?: boolean; data?: Record<string, unknown>; error?: string }; outreach?: { success?: boolean; data?: unknown; error?: string } };
type SalesResult = { success: boolean; error?: string; durationMs?: number; results?: { prospects?: { data?: { items?: Item[]; errors?: unknown[] } }; discover?: { data?: { totalDiscovered?: number; markets?: string[]; providerErrors?: unknown[] } } } };
const MARKET_OPTIONS = ['USA', 'Australia', 'Canada', 'UAE'];
const CONTROL = 'w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[9px] text-[var(--text)] outline-none focus:border-[var(--accent)]';

export default function SalesMachinePanel() {
  const [query, setQuery] = useState('high-intent digital marketing prospects');
  const [niche, setNiche] = useState('digital marketing services');
  const [businessFit, setBusinessFit] = useState('Businesses with clear marketing gaps, active commercial intent, and budget potential.');
  const [growthSignals, setGrowthSignals] = useState('Recent ads, hiring, expansion, new launches, weak social presence, poor SEO, or visible lead-generation gaps.');
  const [markets, setMarkets] = useState(MARKET_OPTIONS);
  const [limit, setLimit] = useState(50);
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [createDrafts, setCreateDrafts] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SalesResult | null>(null);

  async function run() {
    if (!query.trim() || markets.length === 0) return;
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch('/api/sales-machine', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, niche, businessFit, growthSignals, markets, limit, channel, createDrafts }) });
      const data = await response.json() as SalesResult;
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : String(error) });
    } finally { setRunning(false); }
  }

  const data = result?.results?.prospects?.data;
  const items = Array.isArray(data?.items) ? data.items : [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  const providerErrors = Array.isArray(result?.results?.discover?.data?.providerErrors) ? result?.results?.discover?.data?.providerErrors : [];
  const marketLabel = useMemo(() => markets.join(' · '), [markets]);

  function toggleMarket(market: string) {
    setMarkets((current) => current.includes(market) ? current.filter((item) => item !== market) : [...current, market]);
  }

  return (
    <section className="nexor-panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">INTERNATIONAL SALES MACHINE</div><h2 className="mt-1 text-lg font-semibold text-[var(--text)]">USA → Australia → Canada → UAE</h2><p className="mt-1 text-[8px] text-[var(--text-muted)]">Find → Dedup → Research → Score → CRM → Draft → Approval → Queue → Send → Follow-up.</p></div>
        <button type="button" disabled={running || !query.trim() || markets.length === 0} onClick={() => void run()} className="min-h-11 rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50">{running ? 'GENERATING…' : 'GENERATE & RUN'}</button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="TARGET / SEARCH INTENT"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="high-intent dental businesses" className={CONTROL} /></Field>
        <Field label="NICHE"><input value={niche} onChange={(e) => setNiche(e.target.value)} className={CONTROL} /></Field>
        <Field label="BUSINESS-FIT RULES"><textarea value={businessFit} onChange={(e) => setBusinessFit(e.target.value)} rows={3} className={`${CONTROL} resize-none`} /></Field>
        <Field label="GROWTH / BUYING SIGNALS"><textarea value={growthSignals} onChange={(e) => setGrowthSignals(e.target.value)} rows={3} className={`${CONTROL} resize-none`} /></Field>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">TARGET MARKETS</div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{MARKET_OPTIONS.map((market) => <button key={market} type="button" onClick={() => toggleMarket(market)} className={`rounded-lg border px-3 py-2 text-[8px] font-semibold ${markets.includes(market) ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>{markets.includes(market) ? '✓ ' : ''}{market}</button>)}</div></div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Field label="MAX PROSPECTS"><input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className={CONTROL} /></Field>
        <Field label="OUTREACH CHANNEL"><select value={channel} onChange={(e) => setChannel(e.target.value as 'WHATSAPP' | 'EMAIL')} className={CONTROL}><option value="WHATSAPP">WhatsApp drafts</option><option value="EMAIL">Email drafts</option></select></Field>
        <Field label="DRAFT MODE"><button type="button" onClick={() => setCreateDrafts((value) => !value)} className={`${CONTROL} text-left ${createDrafts ? 'border-emerald-500/30' : ''}`}>{createDrafts ? '✓ Create approval-ready drafts' : 'Create drafts OFF'}</button></Field>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="text-[7px] text-[var(--text-muted)]">{markets.length ? `Markets: ${marketLabel}` : 'Select at least one market.'} · Provider credentials and WhatsApp opt-in are still required for real sends.</div><a href="/dashboard/settings/automation" className="font-mono text-[7px] tracking-[0.12em] text-[var(--accent)] underline-offset-4 hover:underline">OPEN ALL AUTOMATION SETTINGS →</a></div>

      <button type="button" disabled={running || !query.trim() || markets.length === 0} onClick={() => void run()} className="mt-4 block w-full min-h-12 rounded-xl bg-[var(--accent)] px-5 py-3 text-[10px] font-bold tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:opacity-50 sm:hidden">{running ? 'GENERATING & RUNNING…' : 'GENERATE & RUN SALES MACHINE'}</button>

      {result && <div className="mt-5 space-y-3"><div className={['rounded-xl border p-3 text-[8px]', result.success ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'].join(' ')}><span className="font-semibold">{result.success ? 'Pipeline completed' : 'Pipeline failed'}</span>{result.durationMs ? ` · ${result.durationMs}ms` : ''}{result.error ? ` · ${result.error}` : ''}</div><div className="grid grid-cols-3 gap-2"><Metric label="Processed" value={items.length} /><Metric label="Errors" value={errors.length} /><Metric label="Discovered" value={result.results?.discover?.data?.totalDiscovered ?? 0} /></div>{(errors.length > 0 || providerErrors.length > 0) && <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] p-3"><div className="font-mono text-[7px] tracking-[0.12em] text-red-500">ACTIONABLE DIAGNOSTICS</div><div className="mt-2 space-y-1 text-[8px] leading-4 text-[var(--text-secondary)]">{[...providerErrors, ...errors].slice(0, 12).map((error, index) => <div key={index}>• {typeof error === 'string' ? error : JSON.stringify(error)}</div>)}</div></div>}<div className="mb-2 text-[7px] font-mono tracking-[0.12em] text-[var(--text-muted)]">TARGET MARKETS: {(result.results?.discover?.data?.markets ?? markets).join(' · ')}</div><div className="overflow-x-auto rounded-xl border border-[var(--border)]"><table className="w-full min-w-[700px] text-left text-[8px]"><thead className="bg-[var(--surface-2)] text-[var(--text-muted)]"><tr><th className="px-3 py-2">Prospect</th><th>Score</th><th>Qualification</th><th>CRM</th><th>Draft</th></tr></thead><tbody>{items.map((item, i) => { const score = item.score?.data?.score; const qualification = item.score?.data?.qualification; const crm = item.crm?.success; const draft = item.outreach?.success; return <tr key={i} className="border-t border-[var(--border)] text-[var(--text-secondary)]"><td className="px-3 py-2 font-semibold text-[var(--text)]">{String(item.lead?.name ?? 'Unknown')}</td><td>{String(score ?? '—')}</td><td>{String(qualification ?? '—')}</td><td>{crm ? '✓' : '—'}</td><td>{draft ? '✓' : '—'}</td></tr>; })}</tbody></table></div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] leading-4 text-[var(--text-secondary)]"><b>After approval:</b> the worker can dispatch only when the selected provider is configured and the recipient is eligible for that channel. WhatsApp cold outreach is intentionally blocked without documented opt-in; the UI should report that block instead of silently leaving the item unchanged.</div></div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-2 block font-mono text-[7px] tracking-[0.12em] text-[var(--text-muted)]">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="font-mono text-[6px] tracking-[0.14em] text-[var(--text-muted)]">{label}</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{String(value)}</div></div>; }
