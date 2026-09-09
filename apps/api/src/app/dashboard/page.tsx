import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ToolLibrary from '@/components/dashboard/ToolLibrary';
import SalesMachinePanel from '@/components/dashboard/SalesMachinePanel';
import VoiceAssistant from '@/components/dashboard/VoiceAssistant';
import { getDatabaseClients, LeadStatus, OutreachStatus, CampaignStatus } from '@nexor/database';

async function getSummary() {
  try {
    const db = getDatabaseClients().write;
    const [leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns] = await Promise.all([
      db.lead.count(), db.lead.count({ where: { status: LeadStatus.QUALIFIED } }), db.lead.count({ where: { status: LeadStatus.REPLIED } }),
      db.lead.count({ where: { status: LeadStatus.MEETING_BOOKED } }), db.lead.count({ where: { status: LeadStatus.WON } }),
      db.outreach.count({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } } }),
      db.outreach.count({ where: { status: OutreachStatus.SENT } }), db.campaign.count({ where: { status: CampaignStatus.RUNNING } }),
    ]);
    return { leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns };
  } catch { return { leads: 0, qualified: 0, replies: 0, meetings: 0, won: 0, drafts: 0, sent: 0, runningCampaigns: 0 }; }
}

export default async function Dashboard() {
  const summary = await getSummary();
  const metrics = [
    ['Leads', summary.leads, 'Total in CRM'], ['Qualified', summary.qualified, 'Ready for outreach'], ['Replies', summary.replies, 'Active conversations'],
    ['Meetings', summary.meetings, 'Booked'], ['Won', summary.won, 'Closed clients'], ['Approvals', summary.drafts, 'Need attention'],
    ['Sent', summary.sent, 'Successful outreach'], ['Running', summary.runningCampaigns, 'Active campaigns'],
  ];
  return <DashboardLayout>
    <main className="space-y-5">
      <section className="nexor-fade nexor-panel relative overflow-hidden p-6 lg:p-8">
        <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full bg-[var(--primary)]/[.06] blur-2xl lg:block" />
        <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
          <div className="max-w-4xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-3 py-1.5 font-mono text-[7px] font-bold tracking-[.17em] text-[var(--primary)]">NEXORAIOS · EXECUTIVE COMMAND CENTER</div>
            <h1 className="nexor-ui-title">One operating layer for your entire growth machine.</h1>
            <p className="mt-4 max-w-2xl text-[11px] leading-6 text-[var(--text-secondary)]">Leads, intelligence, outreach, CRM, social, creative, advertising, SEO and AI agents—connected into one measurable operating system.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">✦</div><div><div className="text-[9px] font-semibold text-[var(--text)]">NEXOR CORE</div><div className="mt-0.5 font-mono text-[7px] text-[var(--success)]">READY · LIVE DATA</div></div></div>
        </div>
      </section>
      <VoiceAssistant />
      <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">{metrics.map(([label,value,sub]) => <div key={label} className="nexor-panel nexor-panel-hover p-4"><div className="nexor-ui-label text-[var(--text-muted)]">{label}</div><div className="mt-2 nexor-ui-number">{value}</div><div className="mt-1 text-[7px] text-[var(--text-muted)]">{sub}</div></div>)}</section>
      <SalesMachinePanel />
      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="nexor-panel p-5"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold text-[var(--text)]">North-star workflow</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Acquisition → revenue, with every handoff visible</div></div><span className="font-mono text-[7px] text-[var(--success)]">CONNECTED</span></div>
          <div className="mt-5 flex flex-wrap items-center gap-2">{['Find','Dedup','Research','Score','CRM','Draft','Approve','Queue','Send','Reply','Follow-up','Close'].map((step,index)=><div key={step} className="flex items-center gap-2"><span className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[8px] font-semibold text-[var(--text)]">{step}</span>{index<11&&<span className="text-[var(--text-muted)]">→</span>}</div>)}</div>
        </div>
        <div className="nexor-panel p-5"><div className="text-[11px] font-semibold text-[var(--text)]">Today’s attention</div><div className="mt-4 space-y-3"><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="nexor-ui-label text-[var(--text-muted)]">APPROVALS</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.drafts}</div><div className="text-[8px] text-[var(--text-secondary)]">Outreach items waiting</div></div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="nexor-ui-label text-[var(--text-muted)]">CAMPAIGNS</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.runningCampaigns}</div><div className="text-[8px] text-[var(--text-secondary)]">Currently running</div></div></div></div>
      </section>
      <ToolLibrary />
    </main>
  </DashboardLayout>;
}
