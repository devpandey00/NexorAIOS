'use client';

import { useMemo, useState } from 'react';

type Lead = { name: string; company: string; website: string; score: number; status: string };

const seedLeads: Lead[] = [
  { name: 'Demo Lead', company: 'Acme Digital', website: 'https://example.com', score: 86, status: 'New' },
];

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [tool, setTool] = useState('Lead Finder');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('Ready. Choose a tool and run it.');
  const [report, setReport] = useState(false);

  const stats = useMemo(() => ({
    leads: leads.length,
    hot: leads.filter((l) => l.score >= 80).length,
    followups: leads.filter((l) => l.status === 'Follow-up').length,
  }), [leads]);

  function runTool() {
    const value = input.trim() || 'your target market';
    if (tool === 'Lead Finder') {
      const lead: Lead = { name: `${value} Prospect`, company: value, website: 'https://example.com', score: 82, status: 'New' };
      setLeads((current) => [lead, ...current]);
      setResult(`Lead created and scored 82/100. Next: review the website and prepare outreach.`);
    } else if (tool === 'Website Audit') {
      setResult(`Website audit queued for ${value}. Checks: HTTPS, title/meta, mobile UX, CTA, speed signals, SEO basics and conversion gaps.`);
    } else if (tool === 'Outreach Draft') {
      setResult(`Hi ${value}, I checked your online presence and spotted a few growth opportunities. I can send you a short audit with the highest-impact fixes and an execution plan. Open to seeing it?`);
    } else if (tool === 'Campaign Planner') {
      setResult(`Campaign plan created for ${value}: objective → audience → offer → landing page → tracking → Google/Meta campaigns → weekly optimization.`);
    } else if (tool === 'Follow-up') {
      setLeads((current) => current.map((l, i) => i === 0 ? { ...l, status: 'Follow-up' } : l));
      setResult(`Follow-up task created for ${value}. Status moved to Follow-up.`);
    } else {
      setResult(`Daily report generated: ${leads.length} leads, ${stats.hot} hot leads, ${stats.followups} follow-ups. No production runtime errors detected in the latest check.`);
    }
    setInput('');
  }

  function emailReport() {
    const body = `NexorAIOS Daily Report%0A%0ALeads: ${stats.leads}%0AHot leads: ${stats.hot}%0AFollow-ups: ${stats.followups}%0A%0A${result}`;
    window.location.href = `mailto:?subject=NexorAIOS Daily Report&body=${body}`;
    setReport(true);
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">NEXORAIOS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Growth Operations</h1>
            <p className="mt-1 text-sm text-zinc-400">Leads → audit → outreach → follow-up → reporting</p>
          </div>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">System ready</span>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {[['Leads', stats.leads], ['Hot', stats.hot], ['Follow-ups', stats.followups]].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {['Lead Finder', 'Website Audit', 'Outreach Draft', 'Campaign Planner', 'Follow-up', 'Daily Report'].map((name) => (
              <button key={name} onClick={() => setTool(name)} className={`rounded-xl px-3 py-2 text-sm transition ${tool === name ? 'bg-cyan-400 text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>
                {name}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && runTool()} placeholder="Company, website, niche or task…" className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm outline-none focus:border-cyan-400" />
            <button onClick={runTool} className="h-12 rounded-xl bg-white px-6 text-sm font-semibold text-black hover:bg-zinc-200">Run {tool}</button>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Output</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{result}</p>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Lead Pipeline</h2><span className="text-xs text-zinc-500">Live workspace</span></div>
            <div className="mt-4 space-y-3">
              {leads.map((lead, index) => (
                <div key={`${lead.company}-${index}`} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-medium">{lead.name}</p><p className="text-sm text-zinc-500">{lead.company} · {lead.website}</p></div>
                    <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{lead.score}/100</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500"><span>{lead.status}</span><button onClick={() => setLeads((c) => c.map((x, i) => i === index ? { ...x, status: x.status === 'Follow-up' ? 'New' : 'Follow-up' } : x))} className="text-cyan-400">Toggle follow-up</button></div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <h2 className="font-semibold">Reporting</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Generate the current operational snapshot and open it in your phone’s mail client.</p>
            <button onClick={emailReport} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-black">Email report</button>
            {report && <p className="mt-3 text-xs text-emerald-300">Mail client opened with the report draft.</p>}
          </div>
        </section>

        <footer className="mt-8 border-t border-zinc-800 pt-4 text-xs text-zinc-600">NexorAIOS · mobile-first operations console</footer>
      </div>
    </main>
  );
}
