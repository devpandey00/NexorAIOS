'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Def = [
  string,
  string,
  string,
  'bool' | 'text' | 'number' | 'select',
  string[]?
];

type Group = [string, Def[]];

const groups: Group[] = [
  [
    'SYSTEM',
    [
      ['maintenance_mode', 'Maintenance mode', 'Pause normal execution without removing access.', 'bool'],
      ['read_only_mode', 'Read-only mode', 'Prevent mutation-heavy founder actions.', 'bool'],
      ['debug_logging', 'Debug logging', 'Increase server diagnostics where supported.', 'bool'],
      ['verbose_activity', 'Verbose activity', 'Keep richer activity events visible.', 'bool'],
      ['auto_refresh', 'Auto refresh', 'Refresh operational telemetry automatically.', 'bool'],
      ['health_polling_seconds', 'Health polling seconds', 'Founder dashboard refresh interval.', 'number'],
      ['timezone', 'System timezone', 'Timezone used by reporting defaults.', 'text'],
      ['default_range', 'Default report range', 'Initial founder telemetry window.', 'select', ['today', '7d', '30d', '90d', '1y']],
      ['compact_sidebar', 'Compact sidebar', 'Reduce navigation density.', 'bool'],
      ['show_advanced', 'Show advanced controls', 'Expose developer controls by default.', 'bool'],
    ],
  ],
  [
    'AUTOMATION',
    [
      ['max_concurrent_jobs', 'Max concurrent jobs', 'Worker concurrency ceiling.', 'number'],
      ['max_daily_outbound', 'Max daily outbound', 'Safety ceiling for outbound sends.', 'number'],
      ['approval_required', 'Approval required', 'Require approval before outbound communication.', 'bool'],
      ['followup_delay_hours', 'Follow-up delay hours', 'Default follow-up delay.', 'number'],
      ['quiet_hours_start', 'Quiet hours start', 'Do not send during this local time.', 'text'],
      ['quiet_hours_end', 'Quiet hours end', 'Resume outbound after this local time.', 'text'],
      ['retry_failed_jobs', 'Retry failed jobs', 'Retry recoverable worker failures.', 'bool'],
      ['retry_limit', 'Retry limit', 'Maximum retries for recoverable jobs.', 'number'],
      ['pause_on_provider_error', 'Pause on provider error', 'Stop automation when a provider repeatedly fails.', 'bool'],
      ['social_auto_publish', 'Social auto publish', 'Allow scheduled social posts to publish automatically.', 'bool'],
      ['whatsapp_auto_send', 'WhatsApp auto send', 'Allow approved WhatsApp queue items to send automatically.', 'bool'],
      ['email_auto_send', 'Email auto send', 'Allow approved email queue items to send automatically.', 'bool'],
    ],
  ],
  [
    'MESSAGING',
    [
      ['whatsapp_session_id', 'WhatsApp session id', 'Preferred OpenWA session identifier.', 'text'],
      ['default_message_channel', 'Default message channel', 'Default outbound channel.', 'select', ['WHATSAPP', 'EMAIL', 'INSTAGRAM', 'LINKEDIN']],
      ['typing_delay_ms', 'Typing delay ms', 'Simulated typing delay where supported.', 'number'],
      ['outbound_rate_limit_per_minute', 'Outbound rate / minute', 'Per-channel throttling target.', 'number'],
      ['duplicate_protection', 'Duplicate protection', 'Prevent repeated identical sends.', 'bool'],
      ['inbound_sync', 'Inbound sync', 'Persist inbound provider messages.', 'bool'],
      ['message_retention_days', 'Message retention days', 'Operational retention preference.', 'number'],
      ['media_max_mb', 'Media max MB', 'Maximum media payload preference.', 'number'],
    ],
  ],
  [
    'SOCIAL',
    [
      ['default_social_platforms', 'Default social platforms', 'Platforms selected for new content.', 'text'],
      ['publish_window_start', 'Publish window start', 'Earliest preferred publishing time.', 'text'],
      ['publish_window_end', 'Publish window end', 'Latest preferred publishing time.', 'text'],
      ['auto_hashtags', 'Auto hashtags', 'Generate hashtags with content.', 'bool'],
      ['require_media_for_instagram', 'Require media for Instagram', 'Block media-less Instagram publish attempts.', 'bool'],
      ['crosspost_enabled', 'Cross-post enabled', 'Allow one approved post to target multiple platforms.', 'bool'],
      ['social_approval_required', 'Social approval required', 'Require approval before provider publishing.', 'bool'],
    ],
  ],
  [
    'REPORTING',
    [
      ['report_range', 'Report range', 'Default reporting period.', 'select', ['today', '7d', '30d', '90d', '1y']],
      ['report_timezone', 'Report timezone', 'Timezone for report windows.', 'text'],
      ['include_failures', 'Include failures', 'Show failed jobs and sends in reports.', 'bool'],
      ['include_provider_ids', 'Include provider ids', 'Show external message/post ids in reports.', 'bool'],
      ['export_format', 'Export format', 'Default export format.', 'select', ['CSV', 'JSON', 'PDF']],
      ['email_reports', 'Email reports', 'Enable scheduled report emails.', 'bool'],
      ['report_schedule', 'Report schedule', 'Default report cadence.', 'select', ['manual', 'daily', 'weekly', 'monthly']],
      ['realtime_dashboard', 'Realtime dashboard', 'Prefer live operational counters.', 'bool'],
    ],
  ],
  [
    'SECURITY',
    [
      ['session_timeout_minutes', 'Session timeout minutes', 'Founder session preference.', 'number'],
      ['require_admin_for_integrations', 'Admin for integrations', 'Restrict integration changes to admins.', 'bool'],
      ['audit_log', 'Audit log', 'Record founder control changes.', 'bool'],
      ['mask_secrets', 'Mask secrets', 'Never render secret values in the UI.', 'bool'],
      ['confirmation_for_bulk_actions', 'Bulk confirmation', 'Require explicit confirmation for bulk actions.', 'bool'],
      ['ip_allowlist_mode', 'IP allowlist mode', 'Reserved security gate for future allowlist enforcement.', 'bool'],
      ['login_alerts', 'Login alerts', 'Surface suspicious login events when available.', 'bool'],
      ['webhook_signature_check', 'Webhook signature checks', 'Require signature verification where adapters support it.', 'bool'],
    ],
  ],
  [
    'UX / FOUNDER',
    [
      ['animations', 'Animations', 'Enable interface transitions.', 'bool'],
      ['sound', 'Sound cues', 'Enable non-critical UI sound cues.', 'bool'],
      ['notifications', 'Notifications', 'Enable founder notifications.', 'bool'],
      ['dashboard_layout', 'Dashboard layout', 'Founder dashboard layout mode.', 'select', ['executive', 'operations', 'compact']],
      ['show_tool_descriptions', 'Tool descriptions', 'Show descriptions in tool cards.', 'bool'],
      ['profile_badge_size', 'Profile badge size', 'Size of founder profile surfaces.', 'select', ['compact', 'standard', 'large']],
      ['show_system_health', 'System health', 'Show health indicators.', 'bool'],
      ['show_live_counters', 'Live counters', 'Show real-time counters on command center.', 'bool'],
    ],
  ],
];

const defs = groups.flatMap(([, items]) => items);

type ControlProps = {
  def: Def;
  value: any;
  onChange: (value: any) => void;
};

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, any>>({});
  const [status, setStatus] = useState('Loading control plane…');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch('/api/founder/control-plane', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Unauthorized');
        setValues(data.controls || {});
        setStatus('Production control plane loaded');
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : 'Could not load controls');
      });
  }, []);

  const filtered = useMemo(
    () =>
      groups
        .map(([name, items]) => [
          name,
          items.filter((def) => `${def[1]} ${def[2]}`.toLowerCase().includes(search.toLowerCase())),
        ] as Group)
        .filter(([, items]) => items.length > 0),
    [search],
  );

  const set = (key: string, value: any) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setStatus('Saving to production database…');
    try {
      const response = await fetch('/api/founder/control-plane', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ controls: values }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Save failed');
      setValues(data.controls || values);
      setDirty(false);
      setStatus(`Saved · ${Object.keys(data.controls || values).length} controls persisted`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    }
  };

  return (
    <DashboardLayout>
      <main className="space-y-5">
        <section className="nexor-panel p-5 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-mono text-[7px] tracking-[.2em] text-[var(--accent)]">NEXOR MEDIA · FOUNDER ADMIN</div>
              <h1 className="mt-1 text-2xl font-semibold">Advanced Control Plane</h1>
              <p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-secondary)]">
                Developer-grade controls for automation, messaging, social publishing, reporting, security and founder UX. Values are stored server-side in the production database.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search 50+ controls…" className="h-10 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[9px] outline-none" />
              <button onClick={save} className="rounded-lg bg-[var(--primary)] px-5 py-2.5 text-[9px] font-bold text-white">
                {dirty ? 'SAVE CHANGES' : 'SAVE CONTROL PLANE'}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="nexor-live">{defs.length} CONTROLS</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[7px] text-[var(--text-muted)]">ADMIN ONLY</span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1.5 font-mono text-[7px] text-[var(--text-muted)]">{status}</span>
          </div>
        </section>

        {filtered.map(([name, items]) => (
          <section key={name} className="nexor-panel overflow-hidden">
            <div className="nx-section-head">
              <div>
                <div className="text-[11px] font-semibold">{name}</div>
                <div className="mt-1 text-[8px] text-[var(--text-muted)]">Operational configuration surface.</div>
              </div>
            </div>
            <div className="grid gap-px bg-[var(--border)] md:grid-cols-2">
              {items.map((def) => (
                <Control key={def[0]} def={def} value={values[def[0]]} onChange={(value) => set(def[0], value)} />
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] p-4 text-[8px] leading-5 text-[var(--text-secondary)]">
          <b>Runtime honesty:</b> controls are stored centrally. A control is not claimed to be an active runtime guard unless the underlying worker/provider reads it. This prevents the admin panel from pretending that a switch changes code that does not consume it yet.
        </section>
      </main>
    </DashboardLayout>
  );
}

function Control({ def, value, onChange }: ControlProps) {
  const type = def[3];

  return (
    <div className="bg-[var(--surface)] p-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold">{def[1]}</div>
          <div className="mt-1 text-[7px] leading-4 text-[var(--text-muted)]">{def[2]}</div>
          <div className="mt-3">
            {type === 'bool' ? (
              <button onClick={() => onChange(!Boolean(value))} className={`relative h-7 w-12 rounded-full ${value ? 'bg-[var(--primary)]' : 'bg-[var(--surface-3)]'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${value ? 'left-6' : 'left-1'}`} />
              </button>
            ) : type === 'select' ? (
              <select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[8px]">
                {(def[4] || []).map((option) => <option key={option}>{option}</option>)}
              </select>
            ) : (
              <input type={type === 'number' ? 'number' : 'text'} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[8px]" />
            )}
          </div>
        </div>
        <span className="font-mono text-[6px] text-[var(--text-muted)]">{def[0]}</span>
      </div>
    </div>
  );
}
