'use client';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-[var(--bg,#f8fafc)] p-5 text-[var(--text,#0f172a)] sm:p-8">
      <section className="mx-auto mt-10 max-w-xl rounded-2xl border border-[var(--border,#e2e8f0)] bg-[var(--surface,#fff)] p-6 shadow-xl">
        <div className="font-mono text-[9px] font-bold tracking-[.18em] text-[var(--accent,#6366f1)]">NEXORAIOS · RECOVERY</div>
        <h1 className="mt-3 text-2xl font-bold">This workspace hit a temporary error.</h1>
        <p className="mt-2 text-sm opacity-70">Your data was not intentionally changed. Retry the workspace; if the problem persists, check System Health and integration readiness.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => reset()} className="rounded-lg bg-[var(--primary,#6366f1)] px-4 py-2.5 text-xs font-bold text-white">Retry workspace</button>
          <a href="/dashboard/settings" className="rounded-lg border border-[var(--border,#e2e8f0)] px-4 py-2.5 text-xs font-bold">Open settings</a>
        </div>
      </section>
    </main>
  );
}
