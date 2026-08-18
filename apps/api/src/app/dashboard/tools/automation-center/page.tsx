import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const triggers = ['New lead captured', 'Lead becomes qualified', 'Website audit completed', 'Campaign crosses threshold', 'Scheduled time'];
const actions = ['Research company', 'Score lead', 'Create CRM record', 'Generate outreach', 'Request approval', 'Send outreach', 'Create follow-up', 'Generate report'];

export default function AutomationCenterPage() {
  return (
    <DashboardLayout>
      <main className="space-y-6">
        <section className="nexor-panel p-7">
          <Link href="/dashboard/workflows" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← WORKFLOWS</Link>
          <div className="mt-5 font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">AI OPS · AUTOMATION CENTER</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Build an automation</h1>
          <p className="mt-3 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Compose a trigger, execution steps, and a human approval gate. This is the control surface for turning Nexor’s tools into repeatable workflows.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="nexor-panel p-5">
            <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">01 · TRIGGER</div>
            <div className="mt-4 space-y-2">{triggers.map((item, i) => <div key={item} className={['rounded-xl border px-3 py-3 text-[8px] font-semibold', i === 0 ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)]'].join(' ')}>{item}</div>)}</div>
          </div>
          <div className="nexor-panel p-5">
            <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">02 · ACTIONS</div>
            <div className="mt-4 space-y-2">{actions.map((item, i) => <div key={item} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[8px] font-semibold"><span>{item}</span><span className="font-mono text-[7px] text-[var(--text-muted)]">{String(i + 1).padStart(2, '0')}</span></div>)}</div>
          </div>
          <div className="nexor-panel p-5">
            <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">03 · CONTROL</div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4"><div className="text-[9px] font-semibold">Human approval</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-secondary)]">Pause before external outreach is sent.</div></div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="text-[9px] font-semibold">Failure policy</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-secondary)]">Retry twice, then create an attention item.</div></div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="text-[9px] font-semibold">Execution log</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-secondary)]">Record every step, input, output, and status.</div></div>
            </div>
          </div>
        </section>

        <section className="nexor-panel p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="text-[11px] font-semibold">Starter workflow</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">New lead → research → score → draft → approval → follow-up</div></div><Link href="/dashboard/tools/autopilot" className="rounded-xl bg-[var(--accent)] px-4 py-3 text-[8px] font-bold text-black">OPEN AUTOPILOT</Link></div>
        </section>
      </main>
    </DashboardLayout>
  );
}
