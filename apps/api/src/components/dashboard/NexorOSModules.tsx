'use client';

import { useMemo, useState } from 'react';

type Module = {
  name: string;
  group: string;
  status: 'LIVE' | 'READY FOR CONNECTION';
  description: string;
  action: string;
};

const modules: Module[] = [
  { name: 'CRM', group: 'Money', status: 'LIVE', description: 'Leads, contacts, pipeline, deals and activity.', action: 'Open CRM' },
  { name: 'Lead Finder', group: 'Money', status: 'READY FOR CONNECTION', description: 'Discover, dedupe, enrich and score prospects.', action: 'Run finder' },
  { name: 'Research Agent', group: 'Money', status: 'LIVE', description: 'Company research, audits, opportunities and pitch.', action: 'Research company' },
  { name: 'Outreach', group: 'Money', status: 'LIVE', description: 'Draft, approve, queue, send and follow up.', action: 'Open outreach' },
  { name: 'Unified Inbox', group: 'Money', status: 'READY FOR CONNECTION', description: 'WhatsApp, email, social and website conversations.', action: 'Connect channels' },
  { name: 'Proposals', group: 'Money', status: 'LIVE', description: 'Generate client-ready proposals and track them.', action: 'Create proposal' },
  { name: 'Meetings', group: 'Money', status: 'READY FOR CONNECTION', description: 'Booking, reminders, briefing, notes and follow-up.', action: 'Connect calendar' },
  { name: 'Browser Agent', group: 'Automation', status: 'LIVE', description: 'Browser research, screenshots, tests and task execution.', action: 'Run browser task' },
  { name: 'Automation Builder', group: 'Automation', status: 'LIVE', description: 'Trigger, condition, action, retry and approval workflows.', action: 'Build workflow' },
  { name: 'AI Agents', group: 'Automation', status: 'LIVE', description: 'Sales, research, SEO, ads, content, video, CRM and executive agents.', action: 'Manage agents' },
  { name: 'Job OS', group: 'Automation', status: 'LIVE', description: 'Discover, score, tailor CV/cover letter and track applications.', action: 'Find jobs' },
  { name: 'Social Media', group: 'Agency', status: 'READY FOR CONNECTION', description: 'Content queue, scheduling, publishing and engagement.', action: 'Connect accounts' },
  { name: 'SEO', group: 'Agency', status: 'READY FOR CONNECTION', description: 'Audits, keywords, rankings and content opportunities.', action: 'Run audit' },
  { name: 'Google Ads', group: 'Agency', status: 'READY FOR CONNECTION', description: 'Campaign planning, keywords, ads, CPL and ROAS.', action: 'Connect Ads' },
  { name: 'Meta Ads', group: 'Agency', status: 'READY FOR CONNECTION', description: 'Creative, copy, audience and campaign performance.', action: 'Connect Meta' },
  { name: 'Projects', group: 'Agency', status: 'LIVE', description: 'Clients, projects, tasks and deliverables.', action: 'Open projects' },
  { name: 'Finance', group: 'Agency', status: 'LIVE', description: 'Revenue, expenses, pending, paid, profit and LTV.', action: 'Open finance' },
  { name: 'Content Factory', group: 'Content', status: 'LIVE', description: 'One topic into multi-channel copy and creative briefs.', action: 'Create content' },
  { name: 'Video Factory', group: 'Content', status: 'LIVE', description: 'Script, scenes, captions, templates and programmatic renders.', action: 'Open Video Agent' },
  { name: 'Website Auditor', group: 'Content', status: 'LIVE', description: 'Browser-backed UX, SEO, performance and conversion audit.', action: 'Audit website' },
  { name: 'Analytics', group: 'Intelligence', status: 'LIVE', description: 'Operational metrics, activity and performance visibility.', action: 'Open analytics' },
  { name: 'Executive AI', group: 'Intelligence', status: 'LIVE', description: 'Ask how the business is performing and what needs attention.', action: 'Ask Nexor' },
];

export default function NexorOSModules() {
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');
  const groups = ['All', ...Array.from(new Set(modules.map((m) => m.group)))];
  const filtered = useMemo(() => modules.filter((m) => (group === 'All' || m.group === group) && `${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase())), [group, query]);

  return (
    <section className="nexor-panel p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">NEXOR OS · WORKFLOW CONTROL</div><h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text)]">Everything in one operating surface</h2><p className="mt-1 text-[8px] text-[var(--text-secondary)]">LIVE means the code path exists. Provider-dependent modules stay clearly marked until credentials/API access are connected.</p></div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search modules…" className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[9px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{groups.map((g) => <button key={g} onClick={() => setGroup(g)} className={`rounded-lg border px-3 py-1.5 text-[8px] font-semibold ${group === g ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>{g}</button>)}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((m) => <div key={m.name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-semibold text-[var(--text)]">{m.name}</div><div className="mt-1 font-mono text-[7px] tracking-[0.12em] text-[var(--text-muted)]">{m.group}</div></div><span className={`rounded-full border px-2 py-1 font-mono text-[6px] tracking-[0.1em] ${m.status === 'LIVE' ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-500' : 'border-amber-500/20 bg-amber-500/[0.06] text-amber-500'}`}>{m.status}</span></div><p className="mt-3 min-h-8 text-[8px] leading-4 text-[var(--text-secondary)]">{m.description}</p><button className="mt-3 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-[8px] font-semibold text-[var(--text)] hover:border-[var(--accent)]/40">{m.action} →</button></div>)}</div>
      {filtered.length === 0 && <div className="py-10 text-center text-[9px] text-[var(--text-muted)]">No module matches that search.</div>}
    </section>
  );
}
