'use client';

import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

export function Topbar({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-nx-border bg-nx-surface px-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[14px] font-semibold uppercase tracking-[0.08em] text-nx-text-primary">NEXOR</span>
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-nx-gold">AIOS</span>
      </div>
      <div className="hidden flex-1 justify-center sm:flex">
        <CommandPalette onRefresh={onRefresh} />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-nx-control border border-nx-border px-3 py-1.5 text-[13px] font-medium text-nx-text-primary transition-colors duration-150 hover:bg-nx-surface-hover disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
