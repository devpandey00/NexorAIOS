import { Sparkles } from 'lucide-react';

export default function DashboardHeader() {
  return (
    <section className="mb-8 flex flex-col justify-between gap-6 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 lg:flex-row lg:items-center">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400">
          <Sparkles className="h-4 w-4" />
          AI Powered Agency Operating System
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-white">Good Evening, Dev 👋</h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
          Your AI employees have already started working. Review today's opportunities, approve
          outreach and let Nexor OS handle the repetitive work.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur">
          <p className="text-sm text-zinc-500">Today's Leads</p>

          <h2 className="mt-2 text-3xl font-bold text-white">1,248</h2>

          <span className="text-sm text-emerald-400">+18%</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur">
          <p className="text-sm text-zinc-500">Qualified</p>

          <h2 className="mt-2 text-3xl font-bold text-white">84</h2>

          <span className="text-sm text-emerald-400">+12%</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur">
          <p className="text-sm text-zinc-500">Meetings</p>

          <h2 className="mt-2 text-3xl font-bold text-white">5</h2>

          <span className="text-sm text-blue-400">Today</span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur">
          <p className="text-sm text-zinc-500">Pipeline</p>

          <h2 className="mt-2 text-3xl font-bold text-white">₹2.4L</h2>

          <span className="text-sm text-yellow-400">Active</span>
        </div>
      </div>
    </section>
  );
}
