import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LeadFinderWorkspace from '@/components/dashboard/LeadFinderWorkspace';
import SocialContentWorkspace from '@/components/dashboard/SocialContentWorkspace';
import { getTool } from '@/lib/dashboard-tools';

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);

  if (!tool) {
    return (
      <DashboardLayout>
        <section className="nexor-panel p-8">
          <div className="font-mono text-[8px] tracking-[0.16em] text-[var(--text-muted)]">TOOL NOT FOUND</div>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--text)]">Unknown Nexor tool</h1>
          <p className="mt-2 text-[10px] text-[var(--text-secondary)]">Return to the Tool Universe and choose an available module.</p>
          <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2 text-[9px] font-bold text-black">BACK TO COMMAND CENTER</Link>
        </section>
      </DashboardLayout>
    );
  }

  if (slug === 'lead-finder') {
    return (
      <DashboardLayout>
        <main className="space-y-5">
          <section className="nexor-fade nexor-panel p-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--accent)]">← COMMAND CENTER</Link>
                <div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">N</span><div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">LEAD GENERATION</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">Lead Finder</h1></div></div>
                <p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Generate targeted search intents and launch the live lead-discovery pipeline from this workspace.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 font-mono text-[7px] tracking-[0.14em] text-emerald-500">LIVE MODULE</span>
            </div>
          </section>
          <LeadFinderWorkspace />
        </main>
      </DashboardLayout>
    );
  }

  if (slug === 'content-calendar' || slug === 'content-ideas' || slug === 'social-scheduler') {
    return (
      <DashboardLayout>
        <main className="space-y-5">
          <section className="nexor-fade nexor-panel p-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--accent)]">← COMMAND CENTER</Link>
                <div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">N</span><div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">SOCIAL MEDIA</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">{tool.name}</h1></div></div>
                <p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Generate, review, approve and schedule social content from one live workspace.</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 font-mono text-[7px] tracking-[0.14em] text-emerald-500">LIVE MODULE</span>
            </div>
          </section>
          <SocialContentWorkspace />
        </main>
      </DashboardLayout>
    );
  }

  const ready = tool.status === 'ready';

  return (
    <DashboardLayout>
      <main className="space-y-5">
        <section className="nexor-fade nexor-panel p-7">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)] hover:text-[var(--accent)]">← COMMAND CENTER</Link>
              <div className="mt-5 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">N</span><div><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{tool.group.toUpperCase()}</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--text)]">{tool.name}</h1></div></div>
              <p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">{tool.description}</p>
            </div>
            <span className={['rounded-full px-3 py-1.5 font-mono text-[7px] tracking-[0.14em]', ready ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'].join(' ')}>{ready ? 'LIVE MODULE' : 'INTEGRATION / BUILD'}</span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="nexor-panel p-5"><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">STATUS</div><div className="mt-2 text-lg font-semibold text-[var(--text)]">{ready ? 'Ready' : 'Architecture ready'}</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">Provider credentials are separated from UI logic.</div></div>
          <div className="nexor-panel p-5"><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">WORKSPACE</div><div className="mt-2 text-lg font-semibold text-[var(--text)]">NexorAIOS</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">One operating surface for this capability.</div></div>
          <div className="nexor-panel p-5"><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">NEXT</div><div className="mt-2 text-lg font-semibold text-[var(--text)]">Connect data</div><div className="mt-1 text-[8px] text-[var(--text-secondary)]">This page is the stable landing surface while the underlying module is wired.</div></div>
        </section>

        <section className="nexor-panel p-6">
          <div className="text-[12px] font-semibold text-[var(--text)]">Module workspace</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Overview','Create','Queue','History'].map((item) => <button key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-left text-[9px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]">{item}<span className="mt-2 block font-normal text-[7px] text-[var(--text-muted)]">Module action surface</span></button>)}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
