'use client';

import { useEffect, useState } from 'react';

type Kind = 'JOB' | 'COMPANY' | 'INFLUENCER';
type Opportunity = { id: string; kind: Kind; title: string; organization: string | null; url: string; location: string | null; status: string };
type Post = { id: string; platform: string; status: string; title: string; caption: string; scheduledAt: string | null };

type Mode = 'AUTOPILOT' | Kind | 'MESSAGE' | 'SOCIAL';

export default function GrowthAutomationWorkspace({ mode = 'AUTOPILOT' }: { mode?: Mode }) {
  const [result, setResult] = useState('');
  const [location, setLocation] = useState('Dubai');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function runAutopilot() {
    setLoading(true);
    setResult('Running discovery + research + drafts + content…');
    try {
      const response = await fetch('/api/autopilot/run', { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Autopilot failed');
      setResult(`Done: ${data.campaigns?.length ?? 0} campaigns, ${data.socialDrafts?.length ?? 0} social drafts, ${data.opportunityDrafts ?? 0} outreach drafts.`);
      await load();
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Autopilot failed');
    } finally {
      setLoading(false);
    }
  }

  async function discover(kind: Kind) {
    setLoading(true);
    setResult(`Searching ${kind.toLowerCase()} opportunities…`);
    try {
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, location, limit: 15 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Discovery failed');
      setOpportunities(data.opportunities ?? []);
      setResult(`${data.count ?? 0} ${kind.toLowerCase()} opportunities found. Company/influencer outreach remains approval-first.`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Discovery failed');
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    const [op, post] = await Promise.all([
      fetch('/api/opportunities?limit=100', { cache: 'no-store' }).then((response) => response.json()),
      fetch('/api/social/content?limit=100', { cache: 'no-store' }).then((response) => response.json()),
    ]);
    if (op.success) setOpportunities(op.opportunities ?? []);
    if (post.success) setPosts(post.posts ?? []);
  }

  useEffect(() => { void load(); }, []);

  const title = mode === 'JOB' ? 'Job Search Autopilot' : mode === 'COMPANY' ? 'Company Prospecting' : mode === 'INFLUENCER' ? 'Influencer Prospecting' : mode === 'MESSAGE' ? 'Message Drafter' : mode === 'SOCIAL' ? 'Social Media Manager' : 'Autopilot Command';
  const kind = mode === 'JOB' || mode === 'COMPANY' || mode === 'INFLUENCER' ? mode : null;

  return (
    <div className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="font-mono text-[7px] tracking-[0.14em] text-[var(--accent)]">{title.toUpperCase()}</div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">LOCATION
            <input value={location} onChange={(event) => setLocation(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" />
          </label>
          {mode === 'AUTOPILOT' && <button disabled={loading} onClick={runAutopilot} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black disabled:opacity-50">{loading ? 'RUNNING…' : 'RUN FULL AUTOPILOT'}</button>}
          {mode === 'JOB' && <button disabled={loading} onClick={() => discover('JOB')} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black">FIND JOBS</button>}
          {mode === 'COMPANY' && <button disabled={loading} onClick={() => discover('COMPANY')} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black">FIND COMPANIES</button>}
          {mode === 'INFLUENCER' && <button disabled={loading} onClick={() => discover('INFLUENCER')} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black">FIND INFLUENCERS</button>}
          {mode === 'SOCIAL' && <a href="/dashboard/tools/content-calendar" className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black">OPEN CONTENT FACTORY</a>}
          {mode === 'MESSAGE' && <a href="/dashboard/tools/whatsapp-drafts" className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black">OPEN DRAFTS</a>}
        </div>
        {mode === 'AUTOPILOT' && <div className="mt-3 text-[8px] text-[var(--text-muted)]">Production runs automatically on the scheduled worker. The button is for local testing only.</div>}
        {result && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[9px] text-[var(--text-secondary)]">{result}</div>}
      </section>

      {mode !== 'JOB' && mode !== 'MESSAGE' && (
        <section className="grid gap-3 md:grid-cols-3">
          <div className="nexor-panel p-4"><div className="text-[8px] text-[var(--text-muted)]">PROSPECTS</div><div className="mt-2 text-2xl font-semibold">{opportunities.filter((item) => item.kind !== 'JOB').length}</div></div>
          <div className="nexor-panel p-4"><div className="text-[8px] text-[var(--text-muted)]">SOCIAL DRAFTS</div><div className="mt-2 text-2xl font-semibold">{posts.filter((post) => post.status === 'DRAFT').length}</div></div>
          <div className="nexor-panel p-4"><div className="text-[8px] text-[var(--text-muted)]">SCHEDULED</div><div className="mt-2 text-2xl font-semibold">{posts.filter((post) => post.status === 'SCHEDULED').length}</div></div>
        </section>
      )}

      {kind && (
        <section className="space-y-3">
          {opportunities.filter((item) => item.kind === kind).map((item) => (
            <article key={item.id} className="nexor-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><div className="font-mono text-[7px] tracking-[0.12em] text-[var(--accent)]">{item.kind} · {item.status}</div><h3 className="mt-2 text-sm font-semibold">{item.title}</h3></div>
                <a href={item.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">OPEN SOURCE</a>
              </div>
              {item.location && <div className="mt-2 text-[8px] text-[var(--text-muted)]">{item.location}</div>}
            </article>
          ))}
          {!opportunities.some((item) => item.kind === kind) && <div className="nexor-panel p-8 text-center text-[9px] text-[var(--text-muted)]">No results yet. Run discovery.</div>}
        </section>
      )}

      {mode === 'AUTOPILOT' && <section className="nexor-panel p-6"><div className="text-[10px] font-semibold">What runs automatically</div><div className="mt-3 grid gap-2 text-[9px] text-[var(--text-secondary)] md:grid-cols-2"><div>Lead discovery → dedup → research → score → pitch drafts</div><div>Job + company + influencer opportunity discovery</div><div>Social content draft generation</div><div>Approval-first outreach + follow-ups</div></div></section>}
    </div>
  );
}
