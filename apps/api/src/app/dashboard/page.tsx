import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ToolLibrary from '@/components/dashboard/ToolLibrary';
import SalesMachinePanel from '@/components/dashboard/SalesMachinePanel';
import VoiceAssistant from '@/components/dashboard/VoiceAssistant';
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
    return { leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns };
  } catch { return { leads: 0, qualified: 0, replies: 0, meetings: 0, won: 0, drafts: 0, sent: 0, runningCampaigns: 0 }; }
}

export default async function Dashboard() {
 const summary=await getSummary();
 const metrics=[['Leads',summary.leads,'CRM universe','ACQUISITION'],['Qualified',summary.qualified,'Ready for outreach','QUALITY'],['Replies',summary.replies,'Active conversations','ENGAGEMENT'],['Meetings',summary.meetings,'Booked','PIPELINE'],['Won',summary.won,'Closed clients','REVENUE'],['Approvals',summary.drafts,'Need attention','CONTROL'],['Sent',summary.sent,'Successful outreach','DELIVERY'],['Running',summary.runningCampaigns,'Active campaigns','EXECUTION']];
 return <DashboardLayout>
  <main className="space-y-5">
   <section className="nexor-fade nexor-panel relative overflow-hidden p-6 lg:p-8">
    <div className="absolute right-[-70px] top-[-80px] h-56 w-56 rounded-full border border-[var(--primary)]/10 bg-[var(--primary-soft)] blur-3xl"/>
    <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-end">
     <div className="max-w-4xl"><div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-3 py-1.5 font-mono text-[7px] font-bold tracking-[.17em] text-[var(--primary)]">NEXORAIOS · EXECUTIVE COMMAND CENTER</span><span className="nexor-live">LIVE DATA</span></div><h1 className="nexor-ui-title max-w-3xl">The operating layer for your entire growth machine.</h1><p className="mt-4 max-w-2xl text-[11px] leading-6 text-[var(--text-secondary)]">Acquisition, intelligence, outreach, CRM, social, creative, advertising, SEO and AI agents—connected to one measurable execution layer.</p></div>
     <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2"><div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><div className="nexor-kicker">SYSTEM</div><div className="mt-1 text-[11px] font-semibold">Nexor Core</div><div className="mt-1 font-mono text-[7px] text-[var(--success)]">OPERATIONAL</div></div><div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><div className="nexor-kicker">MODE</div><div className="mt-1 text-[11px] font-semibold">Executive</div><div className="mt-1 font-mono text-[7px] text-[var(--primary)]">CONTROLLED</div></div></div>
    </div>
   </section>
   <VoiceAssistant/>
   <section><div className="mb-2 flex items-center justify-between"><div><div className="nexor-kicker">BUSINESS TELEMETRY</div><div className="mt-1 text-[12px] font-semibold">Commercial pulse</div></div><div className="font-mono text-[7px] text-[var(--text-muted)]">REAL-TIME CRM AGGREGATES</div></div><div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">{metrics.map(([label,value,sub,group])=><div key={label} className="nexor-panel nexor-panel-hover p-4"><div className="flex items-center justify-between gap-2"><div className="nexor-ui-label text-[var(--text-muted)]">{label}</div><span className="font-mono text-[6px] tracking-[.12em] text-[var(--text-muted)]">{group}</span></div><div className="mt-2 nexor-ui-number">{value}</div><div className="mt-1 text-[7px] text-[var(--text-muted)]">{sub}</div></div>)}</div></section>
   <SalesMachinePanel/>
   <section className="grid gap-4 lg:grid-cols-[1.45fr_.55fr]">
    <div className="nexor-panel overflow-hidden"><div className="nx-section-head"><div><div className="text-[11px] font-semibold">North-star execution loop</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Every commercial handoff stays observable</div></div><span className="nexor-live">CONNECTED</span></div><div className="p-5"><div className="flex flex-wrap items-center gap-2">{['Discover','Deduplicate','Research','Score','CRM','Draft','Approve','Queue','Send','Reply','Follow-up','Close'].map((step,index)=><div key={step} className="flex items-center gap-2"><span className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[8px] font-semibold text-[var(--text)]">{step}</span>{index<11&&<span className="text-[var(--text-muted)]">→</span>}</div>)}</div><div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="rounded-lg bg-[var(--primary-soft)] p-3"><div className="nexor-kicker text-[var(--primary)]">ACQUIRE</div><div className="mt-1 text-[10px] font-semibold">Find high-fit demand</div></div><div className="rounded-lg bg-[var(--accent-soft)] p-3"><div className="nexor-kicker text-[var(--accent)]">CONVERT</div><div className="mt-1 text-[10px] font-semibold">Move qualified conversations</div></div><div className="rounded-lg bg-[color-mix(in_srgb,var(--ai)_8%,transparent)] p-3"><div className="nexor-kicker" style={{color:'var(--ai)'}}>LEARN</div><div className="mt-1 text-[10px] font-semibold">Feed outcomes back into AI</div></div></div></div></div>
    <div className="nexor-panel overflow-hidden"><div className="nx-section-head"><div><div className="text-[11px] font-semibold">Today’s attention</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Only the actions that matter</div></div></div><div className="space-y-2 p-4"><div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="nexor-ui-label text-[var(--text-muted)]">APPROVALS</div><div className="mt-1 text-xl font-semibold tabular-nums">{summary.drafts}</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">Outreach items waiting</div></div><div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="nexor-ui-label text-[var(--text-muted)]">CAMPAIGNS</div><div className="mt-1 text-xl font-semibold tabular-nums">{summary.runningCampaigns}</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">Currently running</div></div><div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="nexor-ui-label text-[var(--text-muted)]">DELIVERY</div><div className="mt-1 text-xl font-semibold tabular-nums">{summary.sent}</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">Outreach successfully sent</div></div></div></div>
   </section>
   <ToolLibrary/>
  </main>
 </DashboardLayout>;
}
