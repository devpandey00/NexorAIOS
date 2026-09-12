'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const CHANNEL_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'EMAIL', label: 'Email' },
  { key: 'INSTAGRAM', label: 'Instagram' },
  { key: 'FACEBOOK', label: 'Facebook' },
  { key: 'LINKEDIN', label: 'LinkedIn' },
] as const;

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
] as const;

const QUEUE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  APPROVAL_REQUIRED: 'Awaiting Approval',
  APPROVED: 'Outbound (Approved)',
  SCHEDULED: 'Scheduled',
  MANUAL_PENDING: 'Manual Required',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

type Overview = {
  generatedAt: string;
  range: { label: string; since: string; until: string | null };
  channel: string;
  stats: { sent: number; failed: number; pending: number; queued: number; replied: number };
  conversations: Array<{
    id: string; channel: string; status: string; last_message_at: string | null;
    company: string; whatsapp: string | null; lead_email: string | null; lead_status: string;
    campaign_name: string | null; last_message: string | null; next_follow_up: string | null;
  }>;
  queue: Array<{ status: string; count: number }>;
  activity: Array<{ id: string; type: string; message: string; created_at: string }>;
  note: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

function formatTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function CommunicationCenter() {
  const [channel, setChannel] = useState<(typeof CHANNEL_TABS)[number]['key']>('ALL');
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]['key']>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (channel !== 'ALL') params.set('channel', channel);
    if (range === 'custom') {
      if (customFrom) params.set('from', customFrom);
      if (customTo) params.set('to', customTo);
    } else {
      params.set('range', range);
    }
    try {
      const response = await fetch(`/api/communication-center/overview?${params.toString()}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Overview unavailable');
      setData(json);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Overview unavailable');
    } finally {
      setLoading(false);
    }
  }, [channel, range, customFrom, customTo]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const statCards = useMemo(
    () => [
      ['Sent', data?.stats.sent ?? 0],
      ['Replied', data?.stats.replied ?? 0],
      ['Queued', data?.stats.queued ?? 0],
      ['Failed', data?.stats.failed ?? 0],
      ['Awaiting Approval', data?.stats.pending ?? 0],
    ] as const,
    [data],
  );

  return (
    <DashboardLayout>
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[var(--text)]">Communication Command Center</div>
              <div className="mt-1 font-mono text-[8px] tracking-[0.14em] text-[var(--text-muted)]">
                WHATSAPP · EMAIL · INSTAGRAM · FACEBOOK · LINKEDIN
              </div>
            </div>
            <button onClick={() => void load()} className="rounded-xl border border-[var(--border)] px-3 py-2 text-[9px] text-[var(--text-secondary)] hover:text-[var(--text)]">
              REFRESH
            </button>
          </section>

          {error && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-[10px] text-amber-400">
              Live data unavailable: {error}
            </section>
          )}

          <section className="flex flex-wrap gap-2">
            {CHANNEL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChannel(tab.key)}
                className={[
                  'rounded-lg border px-3 py-1.5 text-[9px] font-semibold transition',
                  channel === tab.key
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <section className="flex flex-wrap items-center gap-2">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={[
                  'rounded-lg border px-3 py-1.5 text-[9px] transition',
                  range === opt.key
                    ? 'border-[var(--border-strong)] bg-[var(--surface-3)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text)]',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
            {range === 'custom' && (
              <>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-[9px] text-[var(--text)]" />
                <span className="text-[9px] text-[var(--text-muted)]">to</span>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-[9px] text-[var(--text)]" />
              </>
            )}
            <span className="ml-auto font-mono text-[7px] text-[var(--text-muted)]">
              {data?.generatedAt ? `UPDATED ${formatTime(data.generatedAt)}` : 'LOADING'}
            </span>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map(([label, value]) => (
              <div key={label} className="nexor-panel nexor-panel-hover p-4">
                <div className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--text)]">{loading ? '—' : formatNumber(value)}</div>
                <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          {data?.note && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[8px] text-[var(--text-muted)]">
              {data.note}
            </section>
          )}

          <section className="nexor-panel overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <div className="text-[11px] font-semibold text-[var(--text)]">Conversations</div>
              <div className="mt-1 text-[8px] text-[var(--text-muted)]">Real conversation + last-message rows for the selected channel and range</div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-[9px]">
                <thead className="sticky top-0 bg-[var(--surface-2)] font-mono text-[7px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Channel</th>
                    <th className="px-4 py-2">Last Message</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Lead</th>
                    <th className="px-4 py-2">Campaign</th>
                    <th className="px-4 py-2">Next Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(data?.conversations ?? []).map((c) => (
                    <tr key={c.id}>
                      <td className="max-w-[160px] truncate px-4 py-2.5 font-semibold text-[var(--text)]">{c.company}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{c.channel}</td>
                      <td className="max-w-[260px] truncate px-4 py-2.5 text-[var(--text-secondary)]">{c.last_message ?? '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{c.status}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{c.lead_status}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{c.campaign_name ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[7px] text-[var(--text-muted)]">{formatTime(c.next_follow_up)}</td>
                    </tr>
                  ))}
                  {!loading && !(data?.conversations ?? []).length && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[9px] text-[var(--text-muted)]">No conversations for this range/channel.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="nexor-panel">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <div className="text-[11px] font-semibold text-[var(--text)]">Queues</div>
                <div className="mt-1 text-[8px] text-[var(--text-muted)]">Grouped by the real outreach status values that exist today — no fabricated processing/retry buckets</div>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {(data?.queue ?? []).map((q) => (
                  <div key={q.status} className="flex items-center justify-between px-5 py-3">
                    <span className="text-[9px] text-[var(--text-secondary)]">{QUEUE_LABELS[q.status] ?? q.status}</span>
                    <span className="font-mono text-[10px] font-semibold text-[var(--text)]">{formatNumber(q.count)}</span>
                  </div>
                ))}
                {!loading && !(data?.queue ?? []).length && <div className="px-5 py-8 text-center text-[9px] text-[var(--text-muted)]">No outreach records yet.</div>}
              </div>
            </div>

            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text)]">Live Activity</div>
                  <div className="mt-1 text-[8px] text-[var(--text-muted)]">Persisted activity feed</div>
                </div>
                <span className="font-mono text-[7px] text-emerald-500">AUTO REFRESH 30S</span>
              </div>
              <div className="max-h-[360px] divide-y divide-[var(--border)] overflow-auto">
                {(data?.activity ?? []).map((event) => (
                  <div key={event.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-14 shrink-0 font-mono text-[7px] text-[var(--text-muted)]">{formatTime(event.created_at)}</span>
                    <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px] text-[var(--text-secondary)]">{event.type}</span>
                    <span className="truncate text-[9px] text-[var(--text-secondary)]">{event.message}</span>
                  </div>
                ))}
                {!loading && !(data?.activity ?? []).length && <div className="px-5 py-8 text-center text-[9px] text-[var(--text-muted)]">No recent activity.</div>}
              </div>
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
