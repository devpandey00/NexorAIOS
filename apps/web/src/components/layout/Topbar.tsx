'use client';

import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

export function Topbar({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-4 border-b border-nx-border bg-nx-surface/90 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-nx-border bg-nx-surface-elevated nx-accent-glow">
          <span className="text-sm font-black tracking-tight text-nx-teal">N</span>
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-baseline gap-2">
            <span className="text-[14px] font-bold tracking-[0.16em] text-nx-text-primary">NEXOR</span>
            <span className="text-[10px] font-semibold tracking-[0.18em] text-nx-teal">AIOS</span>
          </div>
          <p className="truncate text-[10px] text-nx-text-muted">Enterprise AI Operating System</p>
        </div>
      </div>

      <div className="hidden min-w-0 max-w-xl flex-1 justify-center px-4 md:flex">
        <CommandPalette onRefresh={onRefresh} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh dashboard data"
          className="rounded-nx-control border border-nx-border bg-nx-surface-elevated px-3 py-2 text-xs font-semibold text-nx-text-primary transition hover:border-nx-teal/40 hover:bg-nx-surface-hover disabled:cursor-wait disabled:opacity-50"
        >
          {loading ? 'Syncing…' : 'Refresh'}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
