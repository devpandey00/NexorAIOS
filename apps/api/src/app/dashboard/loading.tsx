export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[var(--bg,#f8fafc)] p-5 text-[var(--text,#0f172a)] sm:p-8">
      <div className="mx-auto max-w-[1680px] space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-[var(--surface-2,#f1f5f9)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--surface-2,#f1f5f9)]" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-[var(--surface-2,#f1f5f9)]" /><div className="h-80 animate-pulse rounded-xl bg-[var(--surface-2,#f1f5f9)]" /></div>
      </div>
    </main>
  );
}
