'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import VoiceAssistant from './VoiceAssistant';

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

type NavItem = readonly [string, string];
type Metric = readonly [string, number];
type AttentionCard = readonly [string, number, string];
type ModuleCard = readonly [string, string, string];

const nav: NavItem[] = [
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

function MetricCard({ label, value }: Metric) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-cyan-300/20 hover:bg-white/[0.04]">
      <div className="font-mono text-[7px] tracking-[0.18em] text-white/35">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
    </div>
  );
}

export default function NexorCommandCenter({ summary }: { summary: Summary }) {
  const [query, setQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notice, setNotice] = useState('');

  const metrics: Metric[] = useMemo(() => [
    ['LEADS', summary.leads],
    ['QUALIFIED', summary.qualified],
    ['REPLIES', summary.replies],
    ['MEETINGS', summary.meetings],
    ['WON', summary.won],
    ['DRAFTS', summary.drafts],
  ], [summary]);

  const attention: AttentionCard[] = useMemo(() => [
    ['FOLLOW-UPS DUE', summary.drafts, '/dashboard/tools/follow-up-manager'],
    ['OUTREACH DRAFTS', summary.drafts, '/dashboard/tools/whatsapp-drafts'],
    ['ACTIVE CAMPAIGNS', summary.runningCampaigns, '/dashboard/tools/google-ads-overview'],
  ], [summary]);

  const modules: ModuleCard[] = [
    ['CRM', 'Pipeline, lead scoring and follow-up control', '/dashboard/tools/crm-pipeline'],
    ['ADVERTISING', 'Meta and Google campaign intelligence', '/dashboard/tools/meta-ads-overview'],
    ['WEB DELIVERY', 'Projects, milestones and client delivery', '/dashboard/tools/website-projects'],
    ['AI OPERATIONS', 'Agents, automations and reporting', '/dashboard/tools/ai-agents'],
  ];

  const acquisition = useMemo(() => {
    const closed = Math.min(summary.won, 10);
    return {
      closed,
      ads: Math.min(closed, 5),
      websites: Math.min(Math.max(closed - 5, 0), 5),
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
    <div className="min-h-[calc(100vh-120px)] overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#05070a] text-white shadow-[0_35px_120px_rgba(0,0,0,.5)]">
      <div className="relative flex min-h-[calc(100vh-120px)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(77,225,245,.09),transparent_28%),radial-gradient(circle_at_20%_100%,rgba(50,110,255,.05),transparent_32%)]" />

        {sidebarOpen && (
          <aside className="relative hidden w-[228px] shrink-0 border-r border-white/[0.07] bg-[#080b0f]/90 lg:flex lg:flex-col">
            <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.07] px-5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/[0.06] text-sm font-black text-cyan-200 shadow-[0_0_30px_rgba(103,232,249,.08)]">
                <span className="absolute inset-1 rounded-lg border border-cyan-200/10" />
                N
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-[0.3em]">NEXOR</div>
                <div className="mt-1 font-mono text-[7px] tracking-[0.22em] text-white/30">INTELLIGENCE OS</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
              <div className="mb-3 px-2 font-mono text-[7px] font-semibold tracking-[0.2em] text-white/25">OPERATIONS</div>
              <div className="space-y-1">
                {nav.map(([label, href]) => (
                  <Link key={href} href={href} className="group flex h-9 items-center rounded-xl px-3 text-[10px] text-white/55 transition hover:bg-white/[0.045] hover:text-white">
                    <span className="mr-3 h-1.5 w-1.5 rounded-full bg-white/15 transition group-hover:bg-cyan-300 group-hover:shadow-[0_0_10px_rgba(103,232,249,.8)]" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.07] p-3">
              <div className={`rounded-xl border p-3 ${summary.dbConnected ? 'border-emerald-300/10 bg-emerald-300/[0.03]' : 'border-amber-300/10 bg-amber-300/[0.03]'}`}>
                <div className="flex items-center gap-2 text-[9px] font-semibold text-white/75">
                  <span className={`h-1.5 w-1.5 rounded-full ${summary.dbConnected ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,.7)]' : 'bg-amber-300'}`} />
                  {summary.dbConnected ? 'Systems online' : 'Database offline'}
                </div>
                <div className="mt-1 font-mono text-[7px] tracking-[0.08em] text-white/25">API · DB · AI · AUTOMATIONS</div>
              </div>
            </div>
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <header className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:border-cyan-300/20 hover:text-white lg:flex" aria-label="Toggle sidebar">☰</button>
              <div className="min-w-0">
                <div className="font-mono text-[7px] tracking-[0.25em] text-cyan-200/65">NEXOR COMMAND CENTER / LIVE</div>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-[-0.045em] md:text-3xl">Business control surface.</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <VoiceAssistant compact />
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.03] px-3 py-2 font-mono text-[7px] tracking-[0.14em] text-white/45">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,.7)]" /> LIVE
              </div>
            </div>
          </header>

          <div className="space-y-5 p-5 lg:p-7">
            <section className="relative overflow-hidden rounded-[24px] border border-cyan-300/10 bg-[linear-gradient(135deg,rgba(255,255,255,.035),rgba(255,255,255,.012))] p-5 md:p-7">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-cyan-300/[0.07] shadow-[0_0_100px_rgba(103,232,249,.05)]" />
              <div className="pointer-events-none absolute right-10 top-10 h-28 w-28 rounded-full border border-cyan-300/[0.06]" />

              <div className="relative grid gap-7 xl:grid-cols-[1fr_auto] xl:items-end">
                <div>
                  <div className="font-mono text-[7px] font-semibold tracking-[0.24em] text-cyan-200/65">NEXOR INTELLIGENCE</div>
                  <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-[1.02] tracking-[-0.055em] md:text-5xl">Everything that matters.<br /><span className="text-white/35">One operating surface.</span></h2>
                  <p className="mt-4 max-w-2xl text-[10px] leading-5 text-white/45">Real operating data, live execution and next-best actions — without fabricated numbers.</p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {metrics.map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
                </div>
              </div>

              <div className="relative mt-6 rounded-2xl border border-white/[0.07] bg-black/25 p-3 md:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-200">✦</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[7px] tracking-[0.16em] text-white/25">COMMAND</div>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void execute(); }} placeholder="Ask Nexor to find, research, analyze or execute…" className="mt-1 w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/25" />
                  </div>
                  <button type="button" onClick={() => void execute()} disabled={!query.trim() || running} className="rounded-xl border border-cyan-300/20 bg-cyan-300/90 px-5 py-2.5 text-[8px] font-bold tracking-[0.15em] text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-30">{running ? 'EXECUTING…' : 'EXECUTE →'}</button>
                </div>
                {notice && <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[9px] text-white/55">{notice}</div>}
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-[21px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="font-mono text-[7px] tracking-[0.2em] text-cyan-200/60">CLIENT ACQUISITION TARGET</div>
                    <div className="mt-1 text-[11px] text-white/45">Monthly objective · 5 Ads + 5 Websites</div>
                  </div>
                  <div className="text-right"><div className="text-2xl font-semibold">{acquisition.closed}<span className="text-white/20">/10</span></div><div className="font-mono text-[7px] tracking-[0.12em] text-white/25">CLOSED</div></div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {([['ADS', acquisition.ads], ['WEBSITES', acquisition.websites]] as const).map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                      <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.16em]"><span className="text-white/30">{label}</span><span className="text-white/55">{value}/5</span></div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,.35)]" style={{ width: `${Math.min((value / 5) * 100, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[21px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="font-mono text-[7px] tracking-[0.2em] text-cyan-200/60">TODAY’S ATTENTION</div>
                <div className="mt-4 space-y-2">
                  {attention.map(([label, value, href]) => (
                    <Link key={href} href={href} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 p-3 transition hover:border-cyan-300/15 hover:bg-white/[0.03]">
                      <div><div className="font-mono text-[7px] tracking-[0.14em] text-white/30">{label}</div><div className="mt-1 text-[8px] text-white/30">Open workspace →</div></div>
                      <div className="text-xl font-semibold">{value}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
              <div className="rounded-[21px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div><div className="font-mono text-[7px] tracking-[0.2em] text-white/25">PIPELINE SIGNAL</div><div className="mt-1 text-[12px] font-semibold">Acquisition funnel</div></div>
                  <Link href="/dashboard/tools/crm-pipeline" className="text-[8px] text-cyan-200/75">OPEN CRM →</Link>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {([['LEADS', summary.leads], ['QUALIFIED', summary.qualified], ['MEETINGS', summary.meetings], ['WON', summary.won]] as const).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 p-3"><div className="font-mono text-[7px] tracking-[0.14em] text-white/25">{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>
                  ))}
                </div>
                <div className="mt-5 flex h-24 items-end gap-2 rounded-xl border border-white/[0.05] bg-[linear-gradient(180deg,rgba(103,232,249,.045),transparent)] p-4">
                  {([summary.leads, summary.qualified, summary.replies, summary.meetings, summary.won]).map((value, index) => <div key={index} className="flex-1 rounded-t-md bg-cyan-300/60" style={{ height: `${Math.max(8, Math.min(100, Math.log10(value + 1) * 27))}%` }} />)}
                </div>
              </div>

              <div className="rounded-[21px] border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="font-mono text-[7px] tracking-[0.2em] text-cyan-200/60">AI PRIORITY</div>
                <div className="mt-1 text-[12px] font-semibold">Next best actions</div>
                <div className="mt-4 space-y-2">
                  {([['01', summary.drafts > 0 ? `Clear ${summary.drafts} pending outreach drafts.` : 'Generate the first outreach batch.'], ['02', summary.qualified > 0 ? `Work the ${summary.qualified} qualified leads first.` : 'Build the qualified pipeline.'], ['03', summary.meetings > 0 ? `Prepare for ${summary.meetings} booked meetings.` : 'Move qualified leads toward meetings.']] as const).map(([number, text]) => (
                    <div key={number} className="flex gap-3 rounded-xl border border-white/[0.05] bg-black/20 p-3"><div className="font-mono text-[8px] text-cyan-200/55">{number}</div><div className="text-[9px] leading-5 text-white/50">{text}</div></div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map(([title, description, href]) => (
                <Link key={href} href={href} className="group rounded-[20px] border border-white/[0.07] bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-white/[0.035]">
                  <div className="flex items-center justify-between"><div className="font-mono text-[7px] tracking-[0.18em] text-white/25">{title}</div><span className="text-white/20 transition group-hover:text-cyan-200">↗</span></div>
                  <div className="mt-3 text-[11px] font-semibold leading-5">{description}</div>
                  <div className="mt-5 font-mono text-[7px] tracking-[0.14em] text-cyan-200/60">OPEN MODULE →</div>
                </Link>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
