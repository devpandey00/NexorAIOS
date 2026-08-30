import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ToolLibrary from '@/components/dashboard/ToolLibrary';
import SalesMachinePanel from '@/components/dashboard/SalesMachinePanel';
import VoiceAssistant from '@/components/dashboard/VoiceAssistant';
import NexorOSModules from '@/components/dashboard/NexorOSModules';
import { getDatabaseClients, LeadStatus, OutreachStatus, CampaignStatus } from '@nexor/database';

async function getSummary() {
  try {
    const db = getDatabaseClients().write;
    const [leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns] = await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { status: LeadStatus.QUALIFIED } }),
      db.lead.count({ where: { status: LeadStatus.REPLIED } }),
      db.lead.count({ where: { status: LeadStatus.MEETING_BOOKED } }),
      db.lead.count({ where: { status: LeadStatus.WON } }),
      db.outreach.count({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } } }),
      db.outreach.count({ where: { status: OutreachStatus.SENT } }),
      db.campaign.count({ where: { status: CampaignStatus.RUNNING } }),
    ]);
    return { leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns, dbConnected: true };
  } catch {
    return { leads: 0, qualified: 0, replies: 0, meetings: 0, won: 0, drafts: 0, sent: 0, runningCampaigns: 0, dbConnected: false };
  }
}

const stages = [
  ['DISCOVER', 'Lead discovery'],
  ['INTEL', 'Research + scoring'],
  ['ENGAGE', 'Personalized outreach'],
  ['CONVERT', 'Meetings + proposals'],
  ['GROW', 'Retention + expansion'],
];

export default async function Dashboard() {
  const summary = await getSummary();
  const metrics = [
    ['LEADS', summary.leads, 'CRM OBJECTS'],
    ['QUALIFIED', summary.qualified, 'SALES READY'],
    ['REPLIES', summary.replies, 'RESPONSES'],
    ['MEETINGS', summary.meetings, 'BOOKED'],
    ['WON', summary.won, 'CLOSED'],
    ['DRAFTS', summary.drafts, 'AWAITING APPROVAL'],
    ['SENT', summary.sent, 'CONFIRMED OUTREACH'],
    ['CAMPAIGNS', summary.runningCampaigns, 'ACTIVE'],
  ];

  return (
    <DashboardLayout>
      <main
        className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#04070a] text-white shadow-[0_35px_120px_rgba(0,0,0,.45)] [--accent:#67e8f9] [--accent-soft:rgba(103,232,249,.08)] [--bg:#04070a] [--border:rgba(255,255,255,.075)] [--border-strong:rgba(255,255,255,.14)] [--shadow:0_20px_70px_rgba(0,0,0,.28)] [--surface:#080d12] [--surface-2:#0d1319] [--surface-3:#151d24] [--success:#34d399] [--text:#f5f7f8] [--text-muted:#68747d] [--text-secondary:#a5afb6]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_58%_0%,rgba(34,211,238,.11),transparent_30%),radial-gradient(circle_at_100%_70%,rgba(59,130,246,.08),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.035] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:42px_42px]" />

        <section className="relative border-b border-white/[.07] px-5 py-5 sm:px-7 lg:px-9 lg:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[7px] tracking-[.22em] text-cyan-200/50">
                <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[.04] px-3 py-1.5 text-cyan-100/75">NEXORAIOS // COMMAND DECK</span>
                <span className="text-white/20">•</span>
                <span>GROWTH OPERATING SYSTEM</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[.035] shadow-[0_0_35px_rgba(34,211,238,.07)] sm:flex">
                  <div className="h-5 w-5 rounded-full border border-cyan-200/50 shadow-[0_0_18px_rgba(103,232,249,.45)]" />
                </div>
                <div>
                  <h1 className="text-3xl font-medium tracking-[-.045em] text-white sm:text-4xl lg:text-5xl">Growth, under command.</h1>
                  <p className="mt-3 max-w-2xl text-[10px] leading-6 text-white/42 sm:text-[11px]">One operational surface for discovery, intelligence, sales, outreach, social, advertising, websites, creative automation and AI agents.</p>
                </div>
              </div>
            </div>
            <div className={`min-w-[230px] rounded-2xl border px-4 py-3 ${summary.dbConnected ? 'border-emerald-300/15 bg-emerald-300/[.035]' : 'border-amber-300/15 bg-amber-300/[.035]'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="font-mono text-[7px] tracking-[.2em] text-white/30">SYSTEM HEALTH</div>
                <span className={`h-1.5 w-1.5 rounded-full ${summary.dbConnected ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,.9)]' : 'bg-amber-300'}`} />
              </div>
              <div className="mt-2 text-[10px] font-medium text-white/85">{summary.dbConnected ? 'CORE SYSTEMS ONLINE' : 'DATABASE CONFIGURATION REQUIRED'}</div>
              <div className="mt-2 flex gap-3 font-mono text-[6px] tracking-[.15em] text-white/25"><span>API {summary.dbConnected ? 'OK' : '--'}</span><span>DB {summary.dbConnected ? 'OK' : '--'}</span><span>AI READY</span></div>
            </div>
          </div>
        </section>

        <section className="relative grid grid-cols-2 border-b border-white/[.07] sm:grid-cols-4 xl:grid-cols-8">
          {metrics.map(([label, value, sub], index) => (
            <div key={label} className={`group border-white/[.06] px-4 py-4 transition hover:bg-white/[.025] ${index % 2 !== 1 ? 'border-r' : ''} sm:border-r xl:border-r xl:last:border-r-0`}>
              <div className="flex items-center justify-between font-mono text-[6px] tracking-[.2em] text-white/25"><span>{label}</span>{(label === 'LEADS' || label === 'WON') && <span className="h-1 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.9)]" />}</div>
              <div className="mt-2 text-2xl font-medium tracking-[-.05em] text-white">{value}</div>
              <div className="mt-1 text-[6px] tracking-[.08em] text-white/20">{sub}</div>
            </div>
          ))}
        </section>

        <section className="relative grid gap-3 p-4 lg:p-5 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-2xl border border-white/[.075] bg-[#070c11]/90">
            <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
              <div><div className="font-mono text-[6px] tracking-[.22em] text-cyan-200/45">PRIMARY CONTROL SURFACE</div><div className="mt-1 text-[11px] font-medium text-white/85">Neural command interface</div></div>
              <div className="rounded-full border border-emerald-300/10 bg-emerald-300/[.025] px-2.5 py-1 font-mono text-[6px] tracking-[.15em] text-emerald-200/60">AUTONOMOUS READY</div>
            </div>
            <div className="grid gap-5 p-4 lg:grid-cols-[1fr_240px] lg:p-5">
              <div className="flex min-h-[250px] flex-col justify-between">
                <div><div className="text-[10px] text-white/70">Command anything across the OS.</div><div className="mt-1 max-w-lg text-[8px] leading-5 text-white/25">Ask Nexor to find opportunities, research a company, prepare outreach, inspect performance or trigger an approved workflow.</div></div>
                <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[.025] p-3 shadow-[inset_0_1px_rgba(255,255,255,.025)]">
                  <div className="font-mono text-[6px] tracking-[.18em] text-cyan-200/40">QUICK COMMAND</div>
                  <div className="mt-2 flex items-center gap-2"><span className="text-cyan-200/50">›</span><span className="font-mono text-[8px] text-white/45">“What needs my attention today?”</span></div>
                </div>
              </div>
              <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-2xl border border-white/[.05] bg-[#05090d]">
                <div className="absolute h-48 w-48 rounded-full border border-cyan-300/[.07]" />
                <div className="absolute h-32 w-32 rounded-full border border-cyan-300/[.11]" />
                <div className="absolute h-20 w-20 rounded-full border border-cyan-300/20 shadow-[0_0_60px_rgba(34,211,238,.12)]" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-cyan-200/40 bg-[#071118] shadow-[0_0_35px_rgba(34,211,238,.16)]"><span className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(103,232,249,1)]" /></div>
                <span className="absolute bottom-4 font-mono text-[6px] tracking-[.22em] text-cyan-200/35">JARVIS CORE // ONLINE</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[.075] bg-[#070c11]/90">
            <div className="border-b border-white/[.06] px-4 py-3"><div className="font-mono text-[6px] tracking-[.22em] text-cyan-200/45">OPERATOR QUEUE</div><div className="mt-1 text-[11px] font-medium text-white/85">Today’s attention</div></div>
            <div className="space-y-2 p-3">
              <div className="rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3"><div className="flex items-center justify-between"><span className="font-mono text-[6px] tracking-[.18em] text-amber-200/45">APPROVALS</span><span className="text-lg font-medium">{summary.drafts}</span></div><div className="mt-1 text-[8px] text-white/30">Outreach drafts waiting</div></div>
              <div className="rounded-xl border border-cyan-300/10 bg-cyan-300/[.025] p-3"><div className="flex items-center justify-between"><span className="font-mono text-[6px] tracking-[.18em] text-cyan-200/45">CAMPAIGNS</span><span className="text-lg font-medium">{summary.runningCampaigns}</span></div><div className="mt-1 text-[8px] text-white/30">Currently running</div></div>
              <div className="rounded-xl border border-white/[.06] bg-white/[.015] p-3"><div className="flex items-center justify-between"><span className="font-mono text-[6px] tracking-[.18em] text-white/25">CLOSED-WON</span><span className="text-lg font-medium">{summary.won}</span></div><div className="mt-1 text-[8px] text-white/30">Revenue events recorded</div></div>
            </div>
          </div>
        </section>

        <section className="relative px-4 pb-1 lg:px-5">
          <div className="rounded-2xl border border-white/[.075] bg-[#070c11]/90 p-4 lg:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="font-mono text-[6px] tracking-[.22em] text-cyan-200/45">NEXOR GROWTH ENGINE</div><div className="mt-1 text-[11px] font-medium text-white/85">Opportunity → revenue pipeline</div></div><div className="font-mono text-[6px] tracking-[.16em] text-white/20">REAL-TIME OPERATING MODEL</div></div>
            <div className="mt-5 grid gap-2 md:grid-cols-5">
              {stages.map(([code, label], index) => <div key={code} className="relative rounded-xl border border-white/[.06] bg-black/20 p-3"><div className="flex items-center justify-between"><span className="font-mono text-[6px] tracking-[.16em] text-cyan-200/45">0{index + 1}</span>{index < stages.length - 1 && <span className="hidden text-white/15 md:block">→</span>}</div><div className="mt-4 text-[9px] font-medium text-white/75">{code}</div><div className="mt-1 text-[7px] text-white/25">{label}</div></div>)}
            </div>
          </div>
        </section>

        <div className="relative space-y-4 p-4 lg:p-5">
          <VoiceAssistant />
          <NexorOSModules />
          <SalesMachinePanel />
          <a href="/dashboard/video-agent" className="group block overflow-hidden rounded-2xl border border-white/[.075] bg-[#070c11]/90 p-5 transition hover:border-cyan-300/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-mono text-[6px] tracking-[.2em] text-cyan-200/45">CREATIVE AUTOMATION</div><div className="mt-2 text-xl font-medium tracking-[-.03em] text-white">Nexor Video Agent</div><div className="mt-1 max-w-2xl text-[8px] leading-5 text-white/30">Raw footage → highlights → captions → brand treatment → render/export.</div></div><span className="rounded-xl border border-white/[.08] bg-white/[.025] px-4 py-2 text-[8px] font-medium text-white/70 transition group-hover:border-cyan-300/20 group-hover:text-cyan-100">OPEN VIDEO AGENT →</span></div>
          </a>
          <ToolLibrary />
        </div>
      </main>
    </DashboardLayout>
  );
}
