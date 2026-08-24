'use client';

import { useEffect, useState } from 'react';

type DashboardData = {
  ok: boolean;
  metrics: {
    leads: number;
    campaigns: number;
    jobs: number;
    outreach: number;
    pendingFollowUps: number;
    openTasks: number;
  };
  recentLeads: Array<{
    id: string;
    businessName: string;
    niche: string;
    country: string;
    status: string;
    auditScore: number | null;
    createdAt: string;
  }>;
  error?: string;
};

const cards = [
  ['leads', 'Leads'],
  ['campaigns', 'Campaigns'],
  ['jobs', 'Jobs'],
  ['outreach', 'Outreach'],
  ['pendingFollowUps', 'Pending follow-ups'],
  ['openTasks', 'Open tasks'],
] as const;

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' });
      const result = (await response.json()) as DashboardData;
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load dashboard');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400">NexorAIOS</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Command Dashboard</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">Live operational data from your Nexor database.</p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="min-h-11 w-full shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error && (
          <section className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:mb-6 sm:p-5">
            <p className="font-semibold text-red-300">Dashboard unavailable</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
            <p className="mt-3 text-xs leading-5 text-zinc-400">Check DATABASE_URL and database connectivity. No fake metrics are shown.</p>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {cards.map(([key, label]) => (
            <article key={key} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/20 sm:p-5">
              <p className="truncate text-xs text-zinc-400 sm:text-sm">{label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums sm:mt-3 sm:text-4xl">{data?.metrics[key] ?? (loading ? '…' : '—')}</p>
            </article>
          ))}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] sm:mt-8">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <h2 className="font-semibold">Recent leads</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Newest records persisted in PostgreSQL.</p>
            </div>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-zinc-500">
                <tr><th className="px-5 py-3">Business</th><th className="px-5 py-3">Niche</th><th className="px-5 py-3">Country</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Score</th></tr>
              </thead>
              <tbody>
                {data?.recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-t border-white/5">
                    <td className="px-5 py-4 font-medium">{lead.businessName}</td>
                    <td className="px-5 py-4 text-zinc-400">{lead.niche}</td>
                    <td className="px-5 py-4 text-zinc-400">{lead.country}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300">{lead.status}</span></td>
                    <td className="px-5 py-4 tabular-nums">{lead.auditScore ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 sm:hidden">
            {data?.recentLeads.map((lead) => (
              <article key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{lead.businessName}</h3>
                    <p className="mt-1 truncate text-xs text-zinc-500">{lead.niche} · {lead.country}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-300">{lead.status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>Audit score</span>
                  <span className="font-semibold tabular-nums text-zinc-300">{lead.auditScore ?? '—'}</span>
                </div>
              </article>
            ))}
          </div>

          {!loading && !error && data?.recentLeads.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">No leads yet. Create the first lead to populate the dashboard.</div>
          )}
        </section>
      </div>
    </main>
  );
}
