'use client';

import { useEffect, useState } from 'react';

type Control = { key: 'master_autopilot' | 'outbound_enabled'; enabled: boolean; label: string };

export default function FounderSafetyControls({ controls }: { controls: Control[] }) {
  const [items, setItems] = useState(controls);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => setItems(controls), [controls]);

  async function toggle(key: Control['key'], enabled: boolean) {
    setBusy(key);
    setMessage('');
    try {
      const response = await fetch('/api/automations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to update control');
      setItems((current) => current.map((item) => (item.key === key ? { ...item, enabled } : item)));
      setMessage(enabled ? `${key === 'master_autopilot' ? 'Autopilot' : 'Outbound'} resumed.` : `${key === 'master_autopilot' ? 'Autopilot' : 'Outbound'} paused.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update control');
    } finally {
      setBusy(null);
    }
  }

  const master = items.find((item) => item.key === 'master_autopilot')?.enabled ?? true;
  const outbound = items.find((item) => item.key === 'outbound_enabled')?.enabled ?? true;
  const live = master && outbound;

  return (
    <section className="nexor-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">FOUNDER SAFETY LAYER</div>
          <div className="mt-1 text-[14px] font-semibold text-[var(--text)]">Autopilot & outbound control</div>
          <div className="mt-1 text-[8px] text-[var(--text-muted)]">Persisted controls. No redeploy required.</div>
        </div>
        <div className={['rounded-full border px-3 py-1.5 font-mono text-[7px] tracking-[0.14em]', live ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-500' : 'border-amber-500/25 bg-amber-500/5 text-amber-400'].join(' ')}>
          {live ? '● AUTOPILOT LIVE' : 'Ⅱ OUTBOUND PAUSED'}
        </div>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        <ControlCard
          title="MASTER AUTOPILOT"
          description="Controls the autonomous operating loop."
          enabled={master}
          busy={busy === 'master_autopilot'}
          onToggle={() => void toggle('master_autopilot', !master)}
        />
        <ControlCard
          title="OUTBOUND COMMUNICATIONS"
          description="Emergency gate for email, WhatsApp and social publishing workers."
          enabled={outbound}
          busy={busy === 'outbound_enabled'}
          danger={!outbound}
          onToggle={() => void toggle('outbound_enabled', !outbound)}
        />
      </div>
      {message && <div className="border-t border-[var(--border)] px-5 py-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}
    </section>
  );
}

function ControlCard({ title, description, enabled, busy, danger, onToggle }: { title: string; description: string; enabled: boolean; busy: boolean; danger?: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[8px] font-bold tracking-[0.12em] text-[var(--text)]">{title}</div>
          <div className="mt-1 max-w-sm text-[8px] leading-4 text-[var(--text-muted)]">{description}</div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className={['relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50', enabled ? 'border-emerald-500/30 bg-emerald-500/15' : danger ? 'border-red-500/30 bg-red-500/10' : 'border-[var(--border)] bg-[var(--surface)]'].join(' ')}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${title}`}
        >
          <span className={['absolute top-1 h-5 w-5 rounded-full transition', enabled ? 'left-6 bg-emerald-400' : 'left-1 bg-[var(--text-muted)]'].join(' ')} />
        </button>
      </div>
      <div className="mt-4 font-mono text-[7px] tracking-[0.1em] text-[var(--text-muted)]">{enabled ? 'ENABLED · WORKERS MAY EXECUTE' : 'PAUSED · NO NEW OUTBOUND SIDE EFFECTS'}</div>
    </div>
  );
}
