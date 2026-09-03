'use client';

import Link from 'next/link';

type Summary = {
  leads: number;
  qualified: number;
  replies: number;
  meetings: number;
  won: number;
  drafts: number;
  sent: number;
  runningCampaigns: number;
  dbConnected: boolean;
};

const cards = [
  ['LEADS', 'Discovery volume', 'leads', '/dashboard/leads'],
  ['QUALIFIED', 'Sales ready', 'qualified', '/dashboard/leads'],
  ['REPLIES', 'Live responses', 'replies', '/dashboard/inbox'],
  ['MEETINGS', 'Booked', 'meetings', '/dashboard/follow-ups'],
  ['WON', 'Closed revenue', 'won', '/dashboard/crm'],
  ['DRAFTS', 'Awaiting approval', 'drafts', '/dashboard/outreach'],
  ['SENT', 'Confirmed outreach', 'sent', '/dashboard/outreach'],
  ['CAMPAIGNS', 'Active runs', 'runningCampaigns', '/dashboard/campaigns'],
] as const;

export default function DashboardPulse({ summary }: { summary: Summary }) {
  const totalActivity = Math.max(summary.leads, summary.sent, summary.replies, 1);
  const stages = [
    ['DISCOVER', summary.leads],
    ['QUALIFY', summary.qualified],
    ['ENGAGE', summary.replies],
    ['MEET', summary.meetings],
    ['WIN', summary.won],
  ] as const;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[.075] bg-[#070c11]/90">
      <div className="flex flex-col gap-3 border-b border-white/[.06] px-4 py-4 sm:flex-row sm:items-end sm:justify-between lg:px-5">
        <div>
          <div className="font-mono text-[6px] tracking-[.22em] text-cyan-200/45">EXECUTIVE OPERATING PULSE</div>
          <div className="mt-1 text-[12px] font-medium text-white/85">Live command metrics</div>
        </div>
        <div className="font-mono text-[6px] tracking-[.16em] text-white/20">REAL DATA · NO DEMO COUNTERS</div>
      </div>

      <div className="grid grid-cols-2 border-b border-white/[.06] sm:grid-cols-4 xl:grid-cols-8">
        {cards.map(([label, sub, key, href], index) => {
          const value = summary[key];
          const width = Math.min(100, Math.round((value / totalActivity) * 100));
          return (
            <Link key={label} href={href} className="group border-b border-r border-white/[.06] px-3 py-4 transition hover:bg-white/[.025] xl:border-b-0 xl:last:border-r-0">
              <div className="flex items-center justify-between font-mono text-[6px] tracking-[.16em] text-white/25">
                <span>{label}</span>
                <span className="text-white/15">→</span>
              </div>
              <div className="mt-2 text-2xl font-medium tracking-[-.05em] text-white">{value}</div>
              <div className="mt-1 text-[6px] text-white/20">{sub}</div>
              <div className="mt-3 h-px overflow-hidden bg-white/[.06]">
                <div className="h-full bg-cyan-300/50 transition-all duration-500 group-hover:bg-cyan-200/80" style={{ width: `${width}%` }} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_.8fr] lg:p-5">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[6px] tracking-[.18em] text-cyan-200/40">CONVERSION FLOW</div>
            <div className="font-mono text-[6px] tracking-[.14em] text-white/15">CURRENT STATE</div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {stages.map(([label, value], index) => {
              const previous = index === 0 ? Math.max(summary.leads, 1) : stages[index - 1][1];
              const rate = index === 0 ? 100 : Math.min(100, Math.round((value / Math.max(previous, 1)) * 100));
              return (
                <div key={label} className="rounded-xl border border-white/[.06] bg-black/20 p-3">
                  <div className="font-mono text-[6px] tracking-[.14em] text-white/20">0{index + 1}</div>
                  <div className="mt-3 text-[8px] font-medium text-white/65">{label}</div>
                  <div className="mt-1 text-lg font-medium text-white">{value}</div>
                  <div className="mt-2 font-mono text-[6px] text-cyan-200/35">{rate}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/[.06] bg-black/20 p-4">
          <div className="font-mono text-[6px] tracking-[.18em] text-cyan-200/40">INTERNATIONAL TARGET GRID</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {['USA', 'AUSTRALIA', 'CANADA', 'UAE'].map((market) => (
              <div key={market} className="rounded-lg border border-cyan-300/[.08] bg-cyan-300/[.02] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[7px] tracking-[.12em] text-white/55">{market}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70 shadow-[0_0_8px_rgba(52,211,153,.45)]" />
                </div>
                <div className="mt-1 text-[6px] text-white/20">DISCOVERY ENABLED</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[7px] leading-4 text-white/25">Sales Machine is configured to discover, research, score and draft outreach across all four target markets.</div>
        </div>
      </div>
    </section>
  );
}
