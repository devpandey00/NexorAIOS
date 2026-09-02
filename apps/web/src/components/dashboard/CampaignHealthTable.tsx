'use client';

import { useMemo, useState } from 'react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import type { CampaignSummary } from '@/lib/types';

type SortKey = 'name' | 'totalLeads' | 'successfulLeads' | 'failedLeads';

const statusTone: Record<string, 'success' | 'neutral' | 'critical' | 'warning' | 'info'> = {
  RUNNING: 'success',
  QUEUED: 'info',
  DRAFT: 'neutral',
  PAUSED: 'neutral',
  COMPLETED: 'neutral',
  PARTIALLY_COMPLETED: 'warning',
  FAILED: 'critical',
  CANCELLED: 'neutral',
};

export function CampaignHealthTable({ campaigns }: { campaigns: CampaignSummary[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalLeads');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q)) : campaigns;
    return [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [campaigns, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Campaign' },
    { key: 'totalLeads', label: 'Total Leads' },
    { key: 'successfulLeads', label: 'Successful' },
    { key: 'failedLeads', label: 'Failed' },
  ];

  return (
    <Panel>
      <PanelHeader
        title="Campaign Performance"
        eyebrow="Operations"
        action={
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search campaigns…"
            className="w-40 rounded-nx-control border border-nx-border bg-nx-surface px-2.5 py-1.5 text-[12px] text-nx-text-primary placeholder:text-nx-text-muted focus:outline focus:outline-2 focus:outline-nx-teal sm:w-52"
            aria-label="Search campaigns"
          />
        }
      />
      {campaigns.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No campaigns yet" description="Campaign performance will appear here once campaigns are created." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead>
              <tr className="border-b border-nx-border">
                {columns.map((col) => (
                  <th key={col.key} className="px-5 py-2.5">
                    <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-nx-text-muted hover:text-nx-text-secondary">
                      {col.label}
                      {sortKey === col.key && <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </button>
                  </th>
                ))}
                <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-nx-text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-nx-border transition-colors duration-150 last:border-0 hover:bg-nx-surface-hover">
                  <td className="px-5 py-3 text-[13px] font-medium text-nx-text-primary">{c.name}</td>
                  <td className="px-5 py-3 text-[13px] text-nx-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.totalLeads}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-nx-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.successfulLeads}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-nx-text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.failedLeads}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone[c.status] ?? 'neutral'}>{c.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
