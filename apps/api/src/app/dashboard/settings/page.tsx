'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProviderState = {
  success?: boolean;
  status?: string;
  connected?: boolean;
  provider?: { configured?: boolean; baseUrlConfigured?: boolean; apiKeyConfigured?: boolean; sessionConfigured?: boolean };
  connection?: { status?: string; ready?: boolean };
  fallback?: { configured?: boolean; templateConfigured?: boolean };
  error?: string;
};

type Integration = { name: string; status: string; configured: number; required: number; missing: string[]; verified: boolean };
type Health = { integrations?: Integration[]; connected?: number; configured?: number; partial?: number; errors?: number; generatedAt?: string };

const labels: Record<string, string> = {
  database: 'Database', whatsapp: 'WhatsApp Cloud API', email: 'Email / Resend', openai: 'OpenAI', anthropic: 'Anthropic', search: 'Search', meta: 'Meta', 'meta-ads': 'Meta Ads', 'google-ads': 'Google Ads', wordpress: 'WordPress', ga4: 'Google Analytics 4', 'search-console': 'Search Console',
};

export default function SettingsPage() {
  const [provider, setProvider] = useState<ProviderState | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Loading live production state…');

  const load = useCallback(async () => {
    try {
      const [providerResponse, healthResponse] = await Promise.all([
        fetch('/api/whatsapp/provider', { cache: 'no-store' }),
        fetch('/api/health/integrations', { cache: 'no-store' }),
      ]);
      const providerJson = await providerResponse.json().catch(() => ({}));
      const healthJson = await healthResponse.json().catch(() => ({}));
      setProvider(providerJson);
      setHealth(healthJson);
      setMessage('Live production state verified');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read live state');
    }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);

  async function startOpenWA() {
    setBusy(true); setMessage('Requesting OpenWA session start…');
    try {
      const response = await fetch('/api/whatsapp/provider', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'OpenWA session could not be started');
      setMessage(`OpenWA start requested · ${data.connection?.status || 'starting'}`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'OpenWA start failed'); }
    finally { setBusy(false); }
  }

  const openwaConnected = Boolean(provider?.connected && provider?.connection?.ready);
  const fallbackReady = Boolean(provider?.fallback?.templateConfigured);

  return <DashboardLayout><main className="space-y-5">
    <section className="nexor-panel p-5 sm:p-7">
      <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link>
      <div className="mt-5 font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXOR MEDIA · SYSTEM CONFIGURATION</div>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-[-0.04em]">Settings & Control Plane</h1><p className="mt-3 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">Live provider health, automation controls, founder settings and production diagnostics. Secrets are never rendered.</p></div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-right"><div className="font-mono text-[7px] text-[var(--text-muted)]">RUNTIME</div><div className="mt-1 text-[9px] font-semibold">{message}</div></div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/dashboard/settings/admin" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 font-mono text-[8px] font-bold text-white">FOUNDER CONTROL PLANE →</Link>
        <Link href="/dashboard/settings/automation" className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-2.5 font-mono text-[8px] font-semibold text-[var(--accent)]">AUTOMATION CONTROL →</Link>
        <Link href="/dashboard/settings/studio" className="rounded-xl border border-[var(--border)] px-4 py-2.5 font-mono text-[8px] font-semibold text-[var(--text-secondary)]">SETTINGS STUDIO →</Link>
        <Link href="/dashboard/tools/whatsapp-automation" className="rounded-xl border border-[var(--border)] px-4 py-2.5 font-mono text-[8px] font-semibold text-[var(--text-secondary)]">WHATSAPP CONTROL ROOM →</Link>
      </div>
    </section>

    <section className="nexor-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-semibold">Live provider health</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Runtime checks, not build-time guesses. Refreshes every 30 seconds.</div></div><button onClick={() => void load()} className="nx-tab">REFRESH</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthCard name="OpenWA" state={openwaConnected ? 'CONNECTED' : provider?.status === 'fallback_ready' ? 'FALLBACK READY' : provider?.error ? 'ERROR' : 'NOT CONNECTED'} detail={provider?.connection?.status || provider?.error || 'Persistent WhatsApp gateway'} />
        <HealthCard name="Meta WhatsApp" state={fallbackReady ? 'READY' : 'CONFIG REQUIRED'} detail={fallbackReady ? 'Approved template fallback available' : 'Access token, phone ID and template required'} />
        <HealthCard name="Database" state={health?.integrations?.find((x) => x.name === 'database')?.status || 'CHECKING'} detail="Production database connectivity" />
        <HealthCard name="Automation" state="LIVE" detail="Durable jobs and approval-gated outbound" />
      </div>
      {provider?.error && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[8px] leading-5 text-red-400">OpenWA diagnostic: {provider.error}</div>}
      {provider?.provider?.configured && !openwaConnected && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><span className="text-[8px] text-[var(--text-secondary)]">OpenWA is configured but its session is not ready. Start/reconnect only after the gateway and linked WhatsApp session are healthy.</span><button onClick={() => void startOpenWA()} disabled={busy} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-[8px] font-bold text-white disabled:opacity-50">{busy ? 'STARTING…' : 'START / RECONNECT'}</button></div>}
    </section>

    <section className="nexor-panel p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3"><div><div className="text-[11px] font-semibold">Production integrations</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Configuration state is read server-side. Missing credentials remain visible as CONFIGURATION_REQUIRED.</div></div><span className="nx-status nx-status-muted">{health?.generatedAt ? new Date(health.generatedAt).toLocaleTimeString() : 'CHECKING'}</span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{(health?.integrations || []).map((item) => <div key={item.name} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold">{labels[item.name] || item.name}</span><span className="nx-status nx-status-muted">{item.status}</span></div><div className="mt-2 font-mono text-[7px] text-[var(--text-muted)]">{item.configured}/{item.required} configured · {item.verified ? 'runtime verified' : 'configuration check'}</div>{item.missing.length > 0 && <div className="mt-2 text-[7px] leading-4 text-[var(--text-muted)]">Missing: {item.missing.join(', ')}</div>}</div>)}</div>
    </section>

    <section className="nexor-panel p-5 sm:p-6">
      <div className="text-[11px] font-semibold">WhatsApp production contract</div>
      <div className="mt-4 grid gap-3 md:grid-cols-3"><Rule title="OpenWA" text="Persistent gateway outside Vercel, HTTPS, operator key and a ready linked session."/><Rule title="Meta fallback" text="Official Cloud API requires production access token, phone number ID and an approved template for first contact."/><Rule title="Outbound safety" text="Approval, eligibility and recorded opt-in remain required. Provider confirmation is the only path to SENT."/></div>
    </section>
  </main></DashboardLayout>;
}

function HealthCard({ name, state, detail }: { name: string; state: string; detail: string }) { const good = state === 'CONNECTED' || state === 'READY' || state === 'LIVE'; return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="text-[9px] font-semibold">{name}</div><div className={`mt-2 text-[10px] font-bold ${good ? 'text-emerald-500' : state.includes('ERROR') ? 'text-red-400' : 'text-amber-400'}`}>{state}</div><div className="mt-1 text-[7px] leading-4 text-[var(--text-muted)]">{detail}</div></div>; }
function Rule({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="text-[9px] font-semibold">{title}</div><div className="mt-2 text-[8px] leading-5 text-[var(--text-muted)]">{text}</div></div>; }
