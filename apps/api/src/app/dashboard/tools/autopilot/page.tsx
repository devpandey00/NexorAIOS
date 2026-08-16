import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GrowthAutomationClient from '@/components/dashboard/GrowthAutomationClient';

export default function AutopilotPage() {
  return (
    <DashboardLayout>
      <main className="space-y-5">
        <section className="nexor-fade nexor-panel p-7">
          <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">
            ← COMMAND CENTER
          </Link>
          <div className="mt-5">
            <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">
              COMMAND & AUTOPILOT
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Autopilot Command</h1>
            <p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">
              Autonomous discovery, research, qualification, outreach drafts, social drafts, and opportunity discovery.
            </p>
          </div>
        </section>
        <GrowthAutomationClient mode="AUTOPILOT" />
      </main>
    </DashboardLayout>
  );
}
