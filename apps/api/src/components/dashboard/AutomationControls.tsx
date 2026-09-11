'use client';

import { useEffect, useState } from 'react';

type Setting = { key: string; label: string; enabled: boolean; updatedAt: string | null };

export default function AutomationControls() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/automations/settings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to load automation controls');
      setSettings(data.settings || []);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function toggle(key: string, enabled: boolean) {
    setSaving(key); setError('');
    try {
      const response = await fetch('/api/automations/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, enabled }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save setting');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setSaving(null); }
  }

  return <section className="nexor-panel p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">AUTOMATION CONTROL</div><h2 className="mt-2 text-xl font-semibold">AI OS capabilities</h2><p className="mt-2 max-w-2xl text-[9px] leading-5 text-[var(--text-secondary)]">Live database-backed switches. Changes take effect on the next worker/API execution — no Vercel redeploy required.</p></div>
      <button onClick={() => void load()} className="rounded-xl border border-[var(--border)] px-3 py-2 font-mono text-[7px] tracking-[0.12em] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]">REFRESH</button>
    </div>
    {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[8px] text-red-300">{error}</div>}
    <div className="mt-5 grid gap-2 md:grid-cols-2">
      {loading ? <div className="rounded-xl border border-[var(--border)] p-4 text-[8px] text-[var(--text-muted)]">Loading controls…</div> : settings.map((setting) => <div key={setting.key} className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div><div className="text-[9px] font-semibold">{setting.label}</div><div className="mt-1 font-mono text-[7px] text-[var(--text-muted)]">{setting.key}</div></div><button disabled={saving === setting.key} onClick={() => void toggle(setting.key, !setting.enabled)} className={`relative h-7 w-12 rounded-full border transition ${setting.enabled ? 'border-emerald-500/30 bg-emerald-500/15' : 'border-[var(--border)] bg-[var(--surface)]'}`} aria-label={`${setting.enabled ? 'Disable' : 'Enable'} ${setting.label}`}><span className={`absolute top-1 h-5 w-5 rounded-full transition ${setting.enabled ? 'left-6 bg-emerald-400' : 'left-1 bg-[var(--text-muted)]'}`} /></button></div>)}
    </div>
  </section>;
}
