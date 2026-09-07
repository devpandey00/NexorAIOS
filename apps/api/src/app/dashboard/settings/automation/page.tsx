import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AutomationControls from '@/components/dashboard/AutomationControls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AutomationSettingsPage() {
  return <DashboardLayout><main className="space-y-5">
    <section className="nexor-panel p-7">
      <Link href="/dashboard/settings" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← SETTINGS</Link>
      <div className="mt-5 font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXORAIOS · AUTOPILOT</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Automation Control Center</h1>
      <p className="mt-3 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">Turn Nexor’s acquisition, research, outreach, follow-up, social and reporting workers on or off from the database. Enabled by default after migration.</p>
    </section>
    <AutomationControls />
    <section className="nexor-panel p-5 text-[9px] leading-5 text-[var(--text-secondary)]">
      <b className="text-[var(--text)]">Safety:</b> automation switches do not bypass provider requirements, approvals, opt-in rules, or authentication. Disabling a capability pauses its worker; it does not delete queued CRM data.
    </section>
  </main></DashboardLayout>;
}
