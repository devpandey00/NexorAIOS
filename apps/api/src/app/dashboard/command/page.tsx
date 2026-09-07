'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Overview = {
  generatedAt: string;
  today: {
    totalLeads: number; qualified: number; outreachReady: number; replied: number; positiveReplies: number;
    meetings: number; proposals: number; won: number; revenue: string; emailsSent: number; whatsappSent: number;
    followups: number; failedJobs: number; runningCampaigns: number;
  };
  pipeline: { open: number; qualified: number; proposal: number; won: number; lost: number };
  hotLeads: Array<{ id: string; business_name: string; country: string; niche: string; audit_score: number; status: string }>;
  activity: Array<{ id: string; type: string; message: string; created_at: string }>;
  integrations: Record<string, string>;
  automation: Array<{ key: string; label: string; enabled: boolean; updatedAt: string | null }>;
  autopilot: { enabled: boolean };
};

const labels: Record<string, string> = {
  campaign_discovery: 'Lead Discovery',
  scheduler: 'Automation Scheduler',
  job_autopilot: 'Job Autopilot',
  autopilot: 'Business Autopilot',
  whatsapp_generation: 'WhatsApp Generation',
  whatsapp_sending: 'WhatsApp Sending',
  followups: 'Follow-ups',
  outreach: 'Outreach Queue',
  social_publishing: 'Social Publishing',
  daily_reports: 'Daily Reports',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CommandCenter() {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [controlBusy, setControlBusy] = useState<string | null>(null);
  const [commandResult, setCommandResult] = useState('');

  async function loadOverview() {
    try {
      const response = await fetch('/api/founder/overview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Overview unavailable');
      setOverview(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Overview unavailable');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
    const timer = window.setInterval(() => void loadOverview(), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function runCommand(nextCommand?: string) {
    const query = (nextCommand ?? command).trim();
    if (!query || running) return;
    setRunning(true);
    setCommandResult('');
    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Command failed');
      setCommandResult(data.execution?.success ? 'Command completed successfully.' : 'Command returned without success.');
      await loadOverview();
    } catch (err) {
      setCommandResult(err instanceof Error ? err.message : 'Command failed');
    } finally {
      setRunning(false);
    }
  }

  async function setAutomation(key: string, enabled: boolean) {
    if (controlBusy) return;
    setControlBusy(key);
    try {
      const response = await fetch('/api/automations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to change automation');
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change automation');
    } finally {
      setControlBusy(null);
    }
  }

  const stats = useMemo(() => {
    const t = overview?.today;
    return [
      [formatNumber(t?.totalLeads ?? 0), 'TOTAL LEADS', '◉'],
      [formatNumber(t?.qualified ?? 0), 'QUALIFIED', '◆'],
      [formatNumber(t?.outreachReady ?? 0), 'OUTREACH READY', '↗'],
      [formatNumber(t?.positiveReplies ?? 0), 'POSITIVE REPLIES', '✦'],
    ];
  }, [overview]);

  return (
    <DashboardLayout>
      <main className="nexor-fade min-h-full">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-lg">
                <img src="/founder-avatar.svg" alt="Nexor Media founder" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-[8px] font-semibold tracking-[0.22em] text-emerald-500">
                    FOUNDER COMMAND CENTER · LIVE
                  </span>
                </div>
                <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[var(--text)] md:text-[36px]">
                  Good morning, DEV BOSS.
                </h1>
                <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
                  NexorAIOS is watching the pipeline. You handle the opportunities that need you.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">SYSTEM</div>
                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {error ? 'ATTENTION' : 'OPERATIONAL'}
                </div>
              </div>
              <button onClick={() => void loadOverview()} className="rounded-xl border border-[var(--border)] px-3 py-2 text-[9px] text-[var(--text-secondary)] hover:text-[var(--text)]">
                REFRESH
              </button>
            </div>
          </section>

          {error && (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-[10px] text-amber-400">
              Live data unavailable: {error}
            </section>
          )}

          <section className="nexor-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
              <div className="flex items-center gap-2"><span className="text-[var(--accent)]">✦</span><span className="text-[11px] font-semibold text-[var(--text)]">Command Nexor</span></div>
              <span className="font-mono text-[7px] tracking-wider text-[var(--text-muted)]">REAL BACKEND COMMANDS</span>
            </div>
            <div className="p-5">
              <textarea value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void runCommand(); }} rows={2} placeholder="Tell Nexor what you want done..." className="w-full resize-none bg-transparent text-[15px] leading-7 text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]" />
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {['Start Nexor', 'Find leads', 'Research market', 'Analyze pipeline'].map((item) => (
                    <button key={item} onClick={() => { if (item === 'Start Nexor') void runCommand('start'); else setCommand(item); }} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[9px] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]">{item}</button>
                  ))}
                </div>
                <button onClick={() => void runCommand()} disabled={!command.trim() || running} className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[9px] font-bold tracking-[0.12em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30">
                  {running ? 'RUNNING...' : 'EXECUTE →'}
                </button>
              </div>
              {commandResult && <div className="mt-3 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[9px] text-[var(--text-secondary)]">{commandResult}</div>}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map(([value, label, icon]) => (
              <div key={label} className="nexor-panel nexor-panel-hover p-4">
                <div className="flex items-center justify-between"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] text-[var(--accent)]">{icon}</div><span className="font-mono text-[8px] text-[var(--text-muted)]">TODAY</span></div>
                <div className="mt-4 text-[29px] font-semibold tracking-[-0.03em] text-[var(--text)]">{loading ? '—' : value}</div>
                <div className="mt-1 font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div><div className="text-[11px] font-semibold text-[var(--text)]">Revenue Pipeline</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Real database opportunity state</div></div>
                <span className="font-mono text-[8px] text-emerald-500">{formatNumber(overview?.today.won ?? 0)} WON</span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-5">
                {Object.entries(overview?.pipeline ?? { open: 0, qualified: 0, proposal: 0, won: 0, lost: 0 }).map(([stage, count]) => (
                  <div key={stage} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="text-[18px] font-semibold text-[var(--text)]">{formatNumber(count)}</div><div className="mt-1 font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{stage}</div></div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] px-5 py-4 md:grid-cols-4">
                <div><div className="text-[18px] font-semibold text-[var(--text)]">{formatNumber(overview?.today.emailsSent ?? 0)}</div><div className="font-mono text-[7px] text-[var(--text-muted)]">EMAIL SENT</div></div>
                <div><div className="text-[18px] font-semibold text-[var(--text)]">{formatNumber(overview?.today.whatsappSent ?? 0)}</div><div className="font-mono text-[7px] text-[var(--text-muted)]">WHATSAPP SENT</div></div>
                <div><div className="text-[18px] font-semibold text-[var(--text)]">{formatNumber(overview?.today.followups ?? 0)}</div><div className="font-mono text-[7px] text-[var(--text-muted)]">FOLLOW-UPS</div></div>
                <div><div className="text-[18px] font-semibold text-[var(--text)]">{formatNumber(overview?.today.failedJobs ?? 0)}</div><div className="font-mono text-[7px] text-[var(--text-muted)]">PROBLEM JOBS</div></div>
              </div>
            </div>

            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><div className="text-[11px] font-semibold text-[var(--text)]">Autopilot Controls</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Every switch is backed by persisted settings</div></div><span className="font-mono text-[7px] text-emerald-500">{overview?.autopilot.enabled ? 'AUTOPILOT ON' : 'PAUSED'}</span></div>
              <div className="max-h-[360px] overflow-auto">
                {(overview?.automation ?? []).map((item) => (
                  <div key={item.key} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3 last:border-0">
                    <div className="min-w-0 flex-1"><div className="text-[9px] font-semibold text-[var(--text)]">{labels[item.key] ?? item.label}</div><div className="mt-0.5 font-mono text-[7px] text-[var(--text-muted)]">{item.enabled ? 'ACTIVE' : 'PAUSED'}</div></div>
                    <button disabled={controlBusy === item.key} onClick={() => void setAutomation(item.key, !item.enabled)} className={['relative h-5 w-9 rounded-full transition disabled:opacity-50', item.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-3)]'].join(' ')} aria-label={`${item.enabled ? 'Disable' : 'Enable'} ${item.label}`}><span className={['absolute top-0.5 h-4 w-4 rounded-full bg-white transition', item.enabled ? 'left-[18px]' : 'left-0.5'].join(' ')} /></button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="nexor-panel">
              <div className="border-b border-[var(--border)] px-5 py-4"><div className="text-[11px] font-semibold text-[var(--text)]">🔥 Highest Priority Leads</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Real leads ranked by stored audit score</div></div>
              <div className="divide-y divide-[var(--border)]">
                {(overview?.hotLeads ?? []).map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 px-5 py-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] font-mono text-[9px] font-bold text-[var(--accent)]">{lead.audit_score}</div><div className="min-w-0 flex-1"><div className="truncate text-[10px] font-semibold text-[var(--text)]">{lead.business_name}</div><div className="mt-0.5 truncate text-[8px] text-[var(--text-muted)]">{lead.niche} · {lead.country}</div></div><span className="font-mono text-[7px] text-[var(--text-muted)]">{lead.status}</span></div>
                ))}
                {!overview?.hotLeads?.length && <div className="px-5 py-8 text-center text-[9px] text-[var(--text-muted)]">No scored leads yet.</div>}
              </div>
            </div>

            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><div className="text-[11px] font-semibold text-[var(--text)]">Live Operations</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Persisted activity feed</div></div><span className="font-mono text-[7px] text-emerald-500">AUTO REFRESH 30S</span></div>
              <div className="divide-y divide-[var(--border)]">
                {(overview?.activity ?? []).map((event) => <div key={event.id} className="flex items-center gap-3 px-5 py-3"><span className="w-14 shrink-0 font-mono text-[7px] text-[var(--text-muted)]">{formatTime(event.created_at)}</span><span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px] text-[var(--text-secondary)]">{event.type}</span><span className="truncate text-[9px] text-[var(--text-secondary)]">{event.message}</span></div>)}
                {!overview?.activity?.length && <div className="px-5 py-8 text-center text-[9px] text-[var(--text-muted)]">No recent activity.</div>}
              </div>
            </div>
          </section>

          <section className="nexor-panel">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><div className="text-[11px] font-semibold text-[var(--text)]">Integration Health</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Configuration state only — not a fabricated connectivity check</div></div><span className="font-mono text-[7px] text-[var(--text-muted)]">{overview?.generatedAt ? `UPDATED ${formatTime(overview.generatedAt)}` : 'LOADING'}</span></div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(overview?.integrations ?? {}).map(([name, status]) => <div key={name} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"><div className="truncate text-[8px] font-semibold capitalize text-[var(--text)]">{name.replace(/([A-Z])/g, ' $1')}</div><div className={['mt-1 font-mono text-[6px]', status === 'CONNECTED' ? 'text-emerald-500' : status === 'CONFIGURED' ? 'text-[var(--accent)]' : 'text-amber-400'].join(' ')}>{status}</div></div>)}
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
