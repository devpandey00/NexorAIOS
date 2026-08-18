import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const workflows = [
  {
    name: 'Lead → Client Engine',
    status: 'READY',
    description: 'Capture leads, enrich company data, score intent, draft outreach, approve, send, and follow up.',
    steps: ['Capture', 'Research', 'Score', 'CRM', 'Draft', 'Approve', 'Send', 'Follow-up'],
    href: '/dashboard/tools/lead-finder',
  },
  {
    name: 'Website Audit → Proposal',
    status: 'READY',
    description: 'Audit a prospect website, surface conversion/SEO problems, and turn findings into a sales-ready action list.',
    steps: ['URL', 'Audit', 'Issues', 'Prioritize', 'Report', 'Proposal'],
    href: '/dashboard/tools/seo-audit',
  },
  {
    name: 'Content Repurposing',
    status: 'READY',
    description: 'Turn one source idea into platform-specific social drafts and queue them for review.',
    steps: ['Idea', 'Hook', 'Script', 'Creative', 'Review', 'Schedule'],
    href: '/dashboard/tools/content-ideas',
  },
  {
    name: 'Ad Optimization Loop',
    status: 'READY',
    description: 'Review campaign performance, identify waste, generate optimization actions, and produce the next test plan.',
    steps: ['Pull', 'Diagnose', 'Prioritize', 'Test', 'Measure', 'Report'],
    href: '/dashboard/tools/google-optimization',
  },
];

export default function WorkflowsPage() {
  return (
    <DashboardLayout>
      <main className="space-y-6">
        <section className="nexor-fade nexor-panel overflow-hidden p-7">
          <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">AI OPS · WORKFLOW ORCHESTRATOR</div>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em]">Workflows</h1>
              <p className="mt-3 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">
                Turn repeatable growth work into deterministic pipelines. Each workflow has a clear trigger, execution path, and handoff point.
              </p>
            </div>
            <Link href="/dashboard/tools/automation-center" className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-[9px] font-semibold text-[var(--accent)]">
              + BUILD WORKFLOW
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <article key={workflow.name} className="nexor-panel nexor-panel-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[7px] tracking-[0.16em] text-emerald-500">{workflow.status}</div>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em]">{workflow.name}</h2>
                  <p className="mt-2 text-[9px] leading-5 text-[var(--text-secondary)]">{workflow.description}</p>
                </div>
                <span className="rounded-lg border border-[var(--border)] px-2 py-1 font-mono text-[7px] text-[var(--text-muted)]">PIPELINE</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {workflow.steps.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-[7px] font-semibold">{step}</span>
                    {index < workflow.steps.length - 1 && <span className="text-[var(--text-muted)]">→</span>}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <Link href={workflow.href} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-semibold hover:bg-[var(--surface-2)]">OPEN TOOL</Link>
                <Link href="/dashboard/tools/automation-center" className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-semibold text-black">AUTOMATE</Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </DashboardLayout>
  );
}
