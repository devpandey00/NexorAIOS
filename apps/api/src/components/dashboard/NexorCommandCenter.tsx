'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

interface Summary {
  leads: number;
  qualified: number;
  replies: number;
  meetings: number;
  won: number;
  drafts: number;
  sent: number;
  runningCampaigns: number;
  dbConnected: boolean;
}

const nav = [
  ['Overview', '/dashboard'],
  ['Autopilot', '/dashboard/command'],
  ['Leads', '/dashboard/tools/lead-inbox'],
  ['CRM', '/dashboard/tools/crm-pipeline'],
  ['Outreach', '/dashboard/tools/whatsapp-drafts'],
  ['Follow-ups', '/dashboard/tools/follow-up-manager'],
  ['Meta Ads', '/dashboard/tools/meta-ads-overview'],
  ['Google Ads', '/dashboard/tools/google-ads-overview'],
  ['Websites', '/dashboard/tools/website-projects'],
  ['Reports', '/dashboard/tools/google-reporting'],
  ['AI Agents', '/dashboard/tools/ai-agents'],
  ['Automations', '/dashboard/tools/automation-center'],
];

export default function NexorCommandCenter({ summary }: { summary: Summary }) {
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState('');

  const goal = useMemo(() => {
    const total = summary.won;
    return {
      ads: Math.min(total, 5),
      websites: Math.min(Math.max(total - 5, 0), 5),
      total: Math.min(total, 10),
    };
  }, [summary.won]);

  async function execute() {
    const clean = query.trim();
    if (!clean || running) return;
    setRunning(true);
    setNotice('');
    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean, context: { source: 'command-center' } }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Command failed');
      const result = data.execution?.result ?? data.execution?.results ?? data.execution ?? data;
      setNotice(typeof result?.message === 'string' ? result.message : 'Command completed.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Command failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#07090b] text-white shadow-[0_30px_120px_rgba(0,0,0,.45)]">
      <div className="relative flex min-h-[calc(100vh-120px)]">
        {sidebarOpen && (
          <aside className="hidden w-[220px] shrink-0 border-r border-white/[0.06] bg-[#0a0c0f] lg:flex lg:flex-col">
            <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/5 text-sm font-bold text-cyan-200">N</div>
              <div>
                <div className="text-[12px] font-bold tracking-[0.28em]">NEXOR</div>
                <div className="mt-0.5 font-mono text-[7px] tracking-[0.2em] text-white/35">INTELLIGENCE OS</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="mb-3 px-2 font-mono text-[7px] tracking-[0.2em] text-white/30">COMMAND</div>
              <div className="space-y-1">
                {nav.map(([label, href]) => (
                  <Link key={href} href={href} className="group flex h-9 items-center rounded-xl px-3 text-[10px] text-white/60 transition hover:bg-white/[0.045] hover:text-white">
                    <span className="mr-3 h-1.5 w-1.5 rounded-full bg-white/20 transition group-hover:bg-cyan-300" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="border-t border-white/[0.06] p-3">
              <div className="rounded-xl border border-emerald-300/10 bg-emerald-300/[0.03] p-3">
                <div className="flex items-center gap-2 text-[9px] font-semibold text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Systems online</div>
                <div className="mt-1 font-mono text-[7px] text-white/30">API · DB · AI · AUTOMATIONS</div>
              </div>
            </div>
          </aside>
        )}

        <section className="min-w-0 flex-1">
          <header className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen((v) => !v)} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/65 lg:flex">☰</button>
              <div>
                <div className="font-mono text-[7px] tracking-[0.24em] text-cyan-200/70">NEXOR COMMAND CENTER</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] md:text-3xl">Business control surface.</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-mono tracking-[0.14em] text-white/45">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> LIVE OPERATIONS
            </div>
          </header>

          <div className="space-y-5 p-5 lg:p-7">
            <section className="rounded-[22px] border border-cyan-300/10 bg-[radial-gradient(circle_at_80%_20%,rgba(103,232,249,.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015))] p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <div className="font-mono text-[7px] tracking-[0.24em] text-cyan-200/70">NEXOR INTELLIGENCE</div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] md:text-5xl">Here are the numbers that matter.</h2>
                  <p className="mt-3 text-[11px] leading-6 text-white/48">Real operating data first. Recommendations second. No fabricated metrics.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[520px]">
                  {[
                    ['LEADS', summary.leads],
                    ['REPLIES', summary.replies],
                    ['MEETINGS', summary.meetings],
                    ['WON', summary.won],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="font-mono text-[7px] tracking-[0.14em] text-white/35">{label}</div>
                      <div className="mt-2 text-xl font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-200">✦</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[7px] tracking-[0.16em] text-white/30">COMMAND</div>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void execute(); }} placeholder="Ask Nexor to find, analyze or execute…" className="mt-1 w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/25" />
                  </div>
                  <button onClick={() => void execute()} disabled={!query.trim() || running} className="rounded-xl border border-cyan-300/20 bg-cyan-300/90 px-4 py-2.5 text-[8px] font-bold tracking-[0.14em] text-black transition hover:bg-cyan-200 disabled:opacity-30">{running ? 'EXECUTING…' : 'EXECUTE →'}</button>
                </div>
                {notice && <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[9px] text-white/60">{notice}</div>}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div><div className="font-mono text-[7px] tracking-[0.18em] text-cyan-200/70">CLIENT ACQUISITION TARGET</div><div className="mt-1 text-[11px] text-white/45">Monthly objective: 5 Ads + 5 Websites</div></div>
                  <div className="text-right"><div className="text-2xl font-semibold">{goal.total}<span className="text-white/25">/10</span></div><div className="font-mono text-[7px] text-white/30">CLOSED</div></div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {[['ADS', goal.ads, 5], ['WEBSITES', goal.websites, 5]].map(([label, value, target]) => (
                    <div key={label} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.16em]"><span className="text-white/35">{label}</span><span className="text-white/55">{value}/{target}</span></div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.min((Number(value) / Number(target)) * 100, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="font-mono text-[7px] tracking-[0.18em] text-cyan-200/70">TODAY’S ATTENTION</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {[
                    ['FOLLOW-UPS', summary.drafts, '/dashboard/tools/follow-up-manager'],
                    ['PROPOSALS / DRAFTS', summary.drafts, '/dashboard/tools/whatsapp-drafts'],
                    ['RUNNING CAMPAIGNS', summary.runningCampaigns, '/dashboard/tools/google-ads-overview'],
                  ].map(([label, value, href]) => <Link key={label} href={href} className="rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:border-cyan-300/15 hover:bg-white/[0.035]"><div className="font-mono text-[7px] tracking-[0.14em] text-white/30">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div><div className="mt-1 text-[8px] text-white/30">Open →</div></Link>)}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 lg:col-span-2">
                <div className="flex items-center justify-between"><div><div className="font-mono text-[7px] tracking-[0.18em] text-white/30">PIPELINE SIGNAL</div><div className="mt-1 text-[12px] font-semibold">Acquisition funnel</div></div><Link href="/dashboard/tools/crm-pipeline" className="text-[8px] text-cyan-200">Open CRM →</Link></div>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    ['LEADS', summary.leads],
                    ['QUALIFIED', summary.qualified],
                    ['MEETINGS', summary.meetings],
                    ['WON', summary.won],
                  ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="font-mono text-[7px] tracking-[0.14em] text-white/30">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>)}
                </div>
                <div className="mt-5 h-28 rounded-xl border border-white/[0.05] bg-[linear-gradient(180deg,rgba(103,232,249,.05),transparent)] p-4">
                  <div className="flex h-full items-end gap-2">
                    {[summary.leads, summary.qualified, summary.replies, summary.meetings, summary.won].map((value, index) => <div key={index} className="flex-1 rounded-t-md bg-cyan-300/70" style={{ height: `${Math.max(6, Math.min(100, Math.log10(Number(value) + 1) * 27))}%` }} />)}
                  </div>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="font-mono text-[7px] tracking-[0.18em] text-cyan-200/70">AI PRIORITY</div>
                <div className="mt-2 text-[12px] font-semibold">Next best actions</div>
                <div className="mt-4 space-y-2">
                  {[
                    ['01', summary.drafts > 0 ? `Clear ${summary.drafts} pending drafts.` : 'Generate your first outreach batch.'],
                    ['02', summary.qualified > 0 ? `Work the ${summary.qualified} qualified leads first.` : 'Build the qualified pipeline.'],
                    ['03', summary.meetings > 0 ? `Prepare for ${summary.meetings} booked meetings.` : 'Push qualified leads toward calls.'],
                  ].map(([n, text]) => <div key={n} className="flex gap-3 rounded-xl border border-white/[0.05] bg-black/20 p-3"><div className="font-mono text-[8px] text-cyan-200/60">{n}</div><div className="text-[9px] leading-5 text-white/55">{text}</div></div>)}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ['CRM', 'Lead flow, pipeline and follow-ups', '/dashboard/tools/crm-pipeline'],
                ['ADVERTISING', 'Meta + Google performance', '/dashboard/tools/meta-ads-overview'],
                ['WEB DELIVERY', 'Website projects and milestones', '/dashboard/tools/website-projects'],
                ['INTELLIGENCE', 'AI agents, automations and reports', '/dashboard/tools/ai-agents'],
              ].map(([title, text, href]) => <Link key={href} href={href} className="group rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-white/[0.03]"><div className="font-mono text-[7px] tracking-[0.18em] text-white/30">{title}</div><div className="mt-2 text-[11px] font-semibold">{text}</div><div className="mt-5 text-[8px] text-cyan-200/75">OPEN MODULE →</div></Link>)}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
