import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiosOperationsPanel from '@/components/dashboard/AiosOperationsPanel';
import { getCommandCenter } from '@/lib/aios-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const money = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export default async function AiosCommandCenter() {
  const data = await getCommandCenter();
  const cards = [['Leads', data.sales.leads, 'Total CRM'], ['Qualified', data.sales.qualified, 'Ready for sales'], ['Replies', data.sales.replies, 'Inbound responses'], ['Meetings', data.sales.meetings, 'Booked'], ['Pipeline', `₹${money(data.sales.pipeline)}`, 'Open opportunity value'], ['Expected', `₹${money(data.sales.expectedRevenue)}`, 'Weighted forecast'], ['Approvals', data.operations.pendingApprovals, 'Need review'], ['Follow-ups', data.operations.followUpsDue, 'Due now']];
  return <DashboardLayout><main className="space-y-6">
    <section className="nexor-panel p-6 lg:p-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="font-mono text-[7px] tracking-[0.2em] text-[var(--accent)]">NEXOR AIOS · OPERATING SYSTEM</div><h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] lg:text-5xl">Command Center</h1><p className="mt-2 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">Acquisition, CRM, sales, social, automation, finance and client delivery in one control surface.</p></div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[.04] px-4 py-3 text-right"><div className="text-[9px] font-semibold text-emerald-500">SYSTEM ONLINE</div><div className="mt-1 font-mono text-[7px] text-[var(--text-muted)]">{data.brand}</div></div></div></section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{cards.map(([label, value, sub]) => <div key={String(label)} className="nexor-panel nexor-panel-hover p-4"><div className="font-mono text-[7px] tracking-[.15em] text-[var(--text-muted)]">{label}</div><div className="mt-2 text-xl font-semibold text-[var(--text)]">{value}</div><div className="mt-1 text-[7px] text-[var(--text-muted)]">{sub}</div></div>)}</section>
    <section className="grid gap-4 lg:grid-cols-3">{[['SALES',[['CRM','/dashboard/tools/crm-pipeline'],['Unified Inbox','/dashboard/tools/whatsapp-inbox'],['Follow-ups','/dashboard/tools/follow-up-manager'],['Sales Messages','/dashboard/tools/whatsapp-drafts']]],['MARKETING',[['Social Hub','/dashboard/tools/social-scheduler'],['Content Studio','/dashboard/tools/content-ideas'],['Creative Library','/dashboard/tools/creative-library'],['Analytics','/dashboard/tools/ga4-analytics']]],['AI OPS',[['Agents','/dashboard/tools/ai-agents'],['Automations','/dashboard/tools/automation-center'],['Opportunities','/dashboard/tools/opportunities'],['Job Applications','/dashboard/tools/opportunities']]]].map(([title, items]) => <div key={String(title)} className="nexor-panel p-5"><div className="font-mono text-[7px] tracking-[.18em] text-[var(--text-muted)]">{title}</div><div className="mt-4 space-y-2">{(items as string[][]).map(([label, href]) => <Link key={label} href={href} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[9px] text-[var(--text)] hover:border-[var(--accent)]/30"><span>{label}</span><span className="text-[var(--accent)]">→</span></Link>)}</div></div>)}</section>
    <AiosOperationsPanel />
    <section className="nexor-panel p-5"><div className="text-[11px] font-semibold">Operating loop</div><div className="mt-4 flex flex-wrap items-center gap-2">{['Discover','Research','Score','CRM','Message','Approve','Send','Reply','Qualify','Proposal','Invoice','Client','Report','Learn'].map((x, i) => <span key={x} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[8px] font-semibold">{x}{i < 13 ? ' →' : ''}</span>)}</div></section>
  </main></DashboardLayout>;
}
