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
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400">NexorAIOS</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Command Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Live operational data from your Nexor database.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </header>

        {error && (
          <section className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <p className="font-semibold text-red-300">Dashboard unavailable</p>
            <p className="mt-1 text-sm text-red-200/80">{error}</p>
            <p className="mt-3 text-xs text-zinc-400">Check DATABASE_URL and database connectivity. No fake metrics are shown.</p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([key, label]) => (
            <article key={key} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20">
              <p className="text-sm text-zinc-400">{label}</p>
              <p className="mt-3 text-4xl font-bold tabular-nums">{data?.metrics[key] ?? (loading ? '…' : '—')}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-semibold">Recent leads</h2>
              <p className="text-xs text-zinc-500">Newest records persisted in PostgreSQL.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
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
                {!loading && !error && data?.recentLeads.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-500">No leads yet. Create the first lead to populate the dashboard.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
