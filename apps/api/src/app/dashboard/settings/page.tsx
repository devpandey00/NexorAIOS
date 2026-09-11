import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function status(value: string | undefined) { return Boolean(value?.trim()); }

export default function SettingsPage() {
  const checks = [
    { key: 'OpenWA base URL', ok: status(process.env.OPENWA_BASE_URL), env: 'OPENWA_BASE_URL' },
    { key: 'OpenWA API key', ok: status(process.env.OPENWA_API_KEY), env: 'OPENWA_API_KEY' },
    { key: 'OpenWA session ID', ok: status(process.env.OPENWA_SESSION_ID), env: 'OPENWA_SESSION_ID' },
    { key: 'WhatsApp Access Token', ok: status(process.env.WHATSAPP_ACCESS_TOKEN), env: 'WHATSAPP_ACCESS_TOKEN' },
    { key: 'WhatsApp Phone Number ID', ok: status(process.env.WHATSAPP_PHONE_NUMBER_ID), env: 'WHATSAPP_PHONE_NUMBER_ID' },
    { key: 'WhatsApp first-contact template', ok: status(process.env.WHATSAPP_TEMPLATE_NAME), env: 'WHATSAPP_TEMPLATE_NAME' },
    { key: 'Automation worker secret', ok: status(process.env.CRON_SECRET), env: 'CRON_SECRET' },
    { key: 'Resend email API', ok: status(process.env.RESEND_API_KEY), env: 'RESEND_API_KEY' },
    { key: 'Daily report sender', ok: status(process.env.REPORT_FROM_EMAIL), env: 'REPORT_FROM_EMAIL' },
    { key: 'Daily report recipient', ok: status(process.env.REPORT_EMAIL_TO), env: 'REPORT_EMAIL_TO' },
  ];

  return <DashboardLayout><main className="space-y-5">
    <section className="nexor-panel p-7">
      <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link>
      <div className="mt-5 font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">SYSTEM CONFIGURATION</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Settings</h1>
      <p className="mt-3 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">One place to see provider configuration and control production automation. Secrets are never displayed.</p>
      <div className="mt-5 flex flex-wrap gap-2"><Link href="/dashboard/settings/automation" className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-2 font-mono text-[8px] font-semibold tracking-[0.12em] text-[var(--accent)]">AUTOMATION CONTROL →</Link><Link href="/dashboard/settings/studio" className="rounded-xl border border-[var(--border)] px-4 py-2 font-mono text-[8px] font-semibold tracking-[0.12em] text-[var(--text-secondary)]">SETTINGS STUDIO →</Link><Link href="/dashboard/tools/whatsapp-automation" className="rounded-xl border border-[var(--border)] px-4 py-2 font-mono text-[8px] font-semibold tracking-[0.12em] text-[var(--text-secondary)]">WHATSAPP CONTROL ROOM →</Link></div>
    </section>
    <section className="nexor-panel p-6">
      <div className="text-[11px] font-semibold">Production readiness</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{checks.map((check) => <div key={check.env} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold">{check.key}</span><span className={`rounded-full px-2 py-1 font-mono text-[7px] ${check.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{check.ok ? 'CONFIGURED' : 'MISSING'}</span></div><div className="mt-2 font-mono text-[7px] text-[var(--text-muted)]">{check.env}</div></div>)}</div>
    </section>
    <section className="nexor-panel p-6">
      <div className="text-[11px] font-semibold">WhatsApp setup</div>
      <ol className="mt-4 space-y-3 text-[9px] leading-5 text-[var(--text-secondary)]">
        <li><b>1.</b> For OpenWA, configure <code className="rounded bg-[var(--surface-2)] px-1">OPENWA_BASE_URL</code>, <code className="rounded bg-[var(--surface-2)] px-1">OPENWA_API_KEY</code> and <code className="rounded bg-[var(--surface-2)] px-1">OPENWA_SESSION_ID</code>, then open the WhatsApp Control Room and start the session.</li>
        <li><b>2.</b> For Meta Cloud API, configure the access token and phone number ID plus an approved first-contact template.</li>
        <li><b>3.</b> Only provider-confirmed sends become <b>SENT</b>. Provider errors are stored as <b>FAILED</b> so the failure is visible instead of silently disappearing.</li>
        <li><b>4.</b> Automated first contact still requires recorded WhatsApp opt-in and valid eligible business-lead data.</li>
        <li><b>5.</b> After environment-variable changes, redeploy and use <Link href="/dashboard/tools/whatsapp-automation" className="text-[var(--accent)] underline">WhatsApp Control Room</Link> → <b>RUN AUTOPILOT</b>.</li>
      </ol>
    </section>
  </main></DashboardLayout>;
}
