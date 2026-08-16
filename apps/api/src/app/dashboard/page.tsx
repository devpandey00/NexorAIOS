import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ToolLibrary from '@/components/dashboard/ToolLibrary';
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
  } catch {
    return { leads: 0, qualified: 0, replies: 0, meetings: 0, won: 0, drafts: 0, sent: 0, runningCampaigns: 0 };
  }
}

export default async function Dashboard() {
  const summary = await getSummary();

  const metrics = [
    ['Leads', summary.leads, 'Total CRM leads'],
    ['Qualified', summary.qualified, 'Ready for outreach'],
    ['Replies', summary.replies, 'Leads that replied'],
    ['Meetings', summary.meetings, 'Booked meetings'],
    ['Won', summary.won, 'Closed clients'],
    ['Drafts', summary.drafts, 'Awaiting approval'],
    ['Sent', summary.sent, 'Successful outreach'],
    ['Running', summary.runningCampaigns, 'Active campaigns'],
  ];

  return (
    <DashboardLayout>
      <main className="space-y-6">
        <section className="nexor-fade nexor-panel overflow-hidden p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1.5 font-mono text-[7px] font-semibold tracking-[0.18em] text-[var(--accent)]">NEXORAIOS · COMMAND CENTER</div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text)] lg:text-5xl">Your entire growth operation, in one place.</h1>
              <p className="mt-3 max-w-3xl text-[11px] leading-6 text-[var(--text-secondary)]">Lead generation, research, outreach, social media, creative, advertising, SEO, websites and AI operations—organized as one premium control surface.</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.55)]" />
              <div><div className="text-[9px] font-semibold text-[var(--text)]">API + DATABASE ONLINE</div><div className="mt-0.5 font-mono text-[7px] text-[var(--text-muted)]">LIVE</div></div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {metrics.map(([label, value, sub]) => (
            <div key={label} className="nexor-panel nexor-panel-hover p-4">
              <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">{label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{value}</div>
              <div className="mt-1 text-[7px] leading-3 text-[var(--text-muted)]">{sub}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="nexor-panel p-5">
            <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold text-[var(--text)]">North-star workflow</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">The core Nexor sales loop</div></div><span className="font-mono text-[7px] text-emerald-500">READY</span></div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {['Find','Dedup','Research','Score','Match','Draft','Approve','Queue','Send','Reply','Follow-up','Close'].map((step, index) => <div key={step} className="flex items-center gap-2"><span className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[8px] font-semibold text-[var(--text)]">{step}</span>{index < 11 && <span className="text-[var(--text-muted)]">→</span>}</div>)}
            </div>
          </div>
          <div className="nexor-panel p-5"><div className="text-[11px] font-semibold text-[var(--text)]">Today’s attention</div><div className="mt-4 space-y-3"><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">APPROVALS</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.drafts}</div><div className="text-[8px] text-[var(--text-secondary)]">Outreach drafts waiting</div></div><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">CAMPAIGNS</div><div className="mt-1 text-lg font-semibold text-[var(--text)]">{summary.runningCampaigns}</div><div className="text-[8px] text-[var(--text-secondary)]">Currently running</div></div></div></div>
        </section>

        <ToolLibrary />
      </main>
    </DashboardLayout>
  );
}
