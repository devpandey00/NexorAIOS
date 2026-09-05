import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function status(value: string | undefined) { return Boolean(value?.trim()); }

export default function SettingsPage() {
  const checks = [
    { key: 'WhatsApp Access Token', ok: status(process.env.WHATSAPP_ACCESS_TOKEN), env: 'WHATSAPP_ACCESS_TOKEN' },
    { key: 'WhatsApp Phone Number ID', ok: status(process.env.WHATSAPP_PHONE_NUMBER_ID), env: 'WHATSAPP_PHONE_NUMBER_ID' },
    { key: 'WhatsApp first-contact template', ok: status(process.env.WHATSAPP_TEMPLATE_NAME), env: 'WHATSAPP_TEMPLATE_NAME' },
    { key: 'Automation worker secret', ok: status(process.env.CRON_SECRET), env: 'CRON_SECRET' },
  ];

  return <DashboardLayout><main className="space-y-5">
    <section className="nexor-panel p-7">
      <Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link>
      <div className="mt-5 font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">SYSTEM CONFIGURATION</div>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Settings</h1>
      <p className="mt-3 max-w-3xl text-[10px] leading-5 text-[var(--text-secondary)]">One place to see which external providers are actually configured. Secrets are never displayed; only configuration status is shown.</p>
    </section>
    <section className="nexor-panel p-6">
      <div className="text-[11px] font-semibold">Production readiness</div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{checks.map((check) => <div key={check.env} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-semibold">{check.key}</span><span className={`rounded-full px-2 py-1 font-mono text-[7px] ${check.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{check.ok ? 'CONFIGURED' : 'MISSING'}</span></div><div className="mt-2 font-mono text-[7px] text-[var(--text-muted)]">{check.env}</div></div>)}</div>
    </section>
    <section className="nexor-panel p-6">
      <div className="text-[11px] font-semibold">WhatsApp setup</div>
      <ol className="mt-4 space-y-3 text-[9px] leading-5 text-[var(--text-secondary)]">
        <li><b>1.</b> Add the Meta WhatsApp Cloud API access token and phone number ID to Vercel Production.</li>
        <li><b>2.</b> Create/approve a Meta WhatsApp message template for business-initiated first contact. Nexor passes the personalized draft as template body variable <code className="rounded bg-[var(--surface-2)] px-1">{{1}}</code>.</li>
        <li><b>3.</b> Set <code className="rounded bg-[var(--surface-2)] px-1">WHATSAPP_TEMPLATE_NAME</code> and <code className="rounded bg-[var(--surface-2)] px-1">WHATSAPP_TEMPLATE_LANGUAGE</code> in Vercel Production.</li>
        <li><b>4.</b> Set the same random <code className="rounded bg-[var(--surface-2)] px-1">CRON_SECRET</code> in Vercel Production and GitHub Actions. Never paste the secret into chat.</li>
        <li><b>5.</b> Redeploy after changing environment variables, then use <Link href="/dashboard/tools/whatsapp-sending" className="text-[var(--accent)] underline">WhatsApp Sending</Link> → <b>Run Due Sends Now</b>.</li>
      </ol>
    </section>
  </main></DashboardLayout>;
}
