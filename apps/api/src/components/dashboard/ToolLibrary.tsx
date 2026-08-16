'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { nexorTools, toolGroups } from '@/lib/dashboard-tools';

export default function ToolLibrary() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nexorTools.filter((tool) => {
      const groupMatch = group === 'All' || tool.group === group;
      const queryMatch = !q || `${tool.name} ${tool.description}`.toLowerCase().includes(q);
      return groupMatch && queryMatch;
    });
  }, [group, query]);

  return (
    <section className="nexor-panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[12px] font-semibold text-[var(--text)]">Nexor Tool Universe</div>
            <div className="mt-1 text-[8px] text-[var(--text-muted)]">100 specialized tools across acquisition, sales, social, creative, ads, SEO and web.</div>
          </div>
          <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools…" className="w-full bg-transparent text-[10px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]" />
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {['All', ...toolGroups].map((item) => (
            <button key={item} onClick={() => setGroup(item)} className={['shrink-0 rounded-lg border px-3 py-1.5 text-[8px] font-semibold transition', group === item ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text)]'].join(' ')}>{item}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
        {filtered.map((tool) => (
          <Link key={tool.slug} href={`/dashboard/tools/${tool.slug}`} className="group bg-[var(--surface)] p-4 transition hover:bg-[var(--surface-2)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">N</div>
              <span className={['rounded-full px-2 py-1 font-mono text-[6px] tracking-[0.12em]', tool.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--surface-3)] text-[var(--text-muted)]'].join(' ')}>{tool.status === 'ready' ? 'READY' : 'CONNECT'}</span>
            </div>
            <div className="mt-3 text-[10px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">{tool.name}</div>
            <div className="mt-1 text-[8px] leading-4 text-[var(--text-muted)]">{tool.description}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
