'use client';

import { useCallback, useEffect, useState } from 'react';

type Outreach = { id: string; channel: string; status: string; message: string; scheduledAt?: string | null };
type Lead = { id: string; businessName: string; website?: string | null; email?: string | null; whatsapp?: string | null; auditScore?: number | null; status: string; outreach: Outreach[] };
type Stats = { leads: number; drafts: number; scheduled: number; sent: number; followups: number };

const tools = ['Lead Finder', 'Website Audit', 'Outreach Draft', 'Campaign Planner', 'Daily Report'];

export default function Dashboard() {
  const [tool, setTool] = useState('Lead Finder');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('Ready. This console is connected to the production tool API.');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats>({ leads: 0, drafts: 0, scheduled: 0, sent: 0, followups: 0 });
  const [busy, setBusy] = useState(false);

  const loadLeads = useCallback(async () => {
    const response = await fetch('/api/leads', { cache: 'no-store' });
    const data = await response.json();
    if (data.success) { setLeads(data.leads); setStats(data.stats); }
  }, []);

  useEffect(() => { loadLeads().catch(() => undefined); }, [loadLeads]);

  async function runTool() {
    setBusy(true);
    setResult('Running real research…');
    try {
      const response = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool, input }) });
      const data = await response.json();
      setResult(data.success ? JSON.stringify(data, null, 2) : `ERROR: ${data.error}`);
      await loadLeads();
    } catch (error) {
      setResult(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    } finally { setBusy(false); }
  }

  async function approve(outreachId: string, channel: string) {
    if (channel === 'WHATSAPP' && !window.confirm('Confirm that this recipient has opted in to receive WhatsApp messages from Nexor Media.')) return;
    const response = await fetch('/api/outreach/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outreachId, whatsappOptIn: channel === 'WHATSAPP', scheduleAt: new Date().toISOString() }) });
    const data = await response.json();
    setResult(data.success ? 'Outreach approved and queued for the next sender run.' : `ERROR: ${data.error}`);
    await loadLeads();
  }

  async function sendReportNow() {
    setBusy(true);
    try {
      const response = await fetch('/api/cron/report?hours=2', { cache: 'no-store' });
      const data = await response.json();
      setResult(data.success ? `Report sent successfully.\n\n${JSON.stringify(data.summary, null, 2)}` : `Report not sent: ${data.email?.error ?? data.error}`);
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">NEXORAIOS</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Growth Operations</h1><p className="mt-1 text-sm text-zinc-400">Discover → research → score → personalize → approve → send → report</p></div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Production tools connected</span>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[["Leads", stats.leads], ["Drafts", stats.drafts], ["Queued", stats.scheduled], ["Sent", stats.sent], ["Follow-ups", stats.followups]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">{tools.map((name) => <button key={name} onClick={() => setTool(name)} className={`rounded-xl px-3 py-2 text-sm ${tool === name ? 'bg-cyan-400 text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>{name}</button>)}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !busy && runTool()} placeholder={tool === 'Website Audit' ? 'https://example.com' : 'e.g. dental clinics in Dubai, interior designers in London…'} className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm outline-none focus:border-cyan-400" />
            <button disabled={busy} onClick={runTool} className="h-12 rounded-xl bg-white px-6 text-sm font-semibold text-black disabled:opacity-50">{busy ? 'Running…' : `Run ${tool}`}</button>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4"><p className="text-xs uppercase tracking-wider text-zinc-500">Live Output</p><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-zinc-200">{result}</pre></div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Lead Pipeline</h2><button onClick={() => loadLeads()} className="text-xs text-cyan-400">Refresh</button></div>
            <div className="mt-4 space-y-3">
              {leads.length === 0 && <p className="text-sm text-zinc-500">No leads yet. Run Lead Finder.</p>}
              {leads.map((lead) => { const outreach = lead.outreach?.[0]; return <div key={lead.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{lead.businessName}</p><p className="text-xs text-zinc-500">{lead.website ?? 'No website'} · {lead.email ?? lead.whatsapp ?? 'No contact found'}</p></div><span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{lead.auditScore ?? '—'}/100</span></div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500"><span>{lead.status}</span>{outreach && <><span>{outreach.channel} · {outreach.status}</span>{outreach.status === 'DRAFT' && <button onClick={() => approve(outreach.id, outreach.channel)} className="rounded-lg bg-cyan-400 px-3 py-2 font-semibold text-black">Approve & queue</button>}</>}</div>
              </div>; })}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <h2 className="font-semibold">Reporting</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">A 2-hour operational report is scheduled automatically. You can also force one now.</p>
            <button disabled={busy} onClick={sendReportNow} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">Send report now</button>
            <div className="mt-5 rounded-xl border border-zinc-800 p-4 text-xs text-zinc-500"><p>Automation cadence</p><p className="mt-1 text-zinc-200">Every 2 hours</p><p className="mt-3">WhatsApp</p><p className="mt-1">Only sends when recipient opt-in is recorded and a configured approved template exists.</p></div>
          </div>
        </section>

        <footer className="mt-8 border-t border-zinc-800 pt-4 text-xs text-zinc-600">NexorAIOS · production operations console</footer>
      </div>
    </main>
  );
}
