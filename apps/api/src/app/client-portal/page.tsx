import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform } from '@/lib/aios-platform';
import { verifyClientPortalToken } from '@/lib/client-portal';

export default async function ClientPortal({ searchParams }: { searchParams: Promise<{ workspace?: string; token?: string }> }) {
  const params = await searchParams;
  const workspaceId = params.workspace || '';
  const token = params.token || '';
  if (!workspaceId || !verifyClientPortalToken(token, workspaceId)) return <main className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text)]"><div className="mx-auto max-w-lg nexor-panel p-8"><div className="font-mono text-[8px] text-red-400">ACCESS DENIED</div><h1 className="mt-2 text-2xl font-semibold">Invalid or expired portal link</h1><p className="mt-2 text-[10px] text-[var(--text-secondary)]">Ask your Nexor account owner for a fresh client portal link.</p></div></main>;
  await ensureAiosPlatform();
  const db = getDatabaseClients().read;
  const rows = await db.$queryRawUnsafe<any[]>(`SELECT w.*, o.checklist FROM public.aios_client_workspaces w LEFT JOIN public.aios_client_onboarding o ON o.workspace_id=w.id WHERE w.id=$1::uuid LIMIT 1`, workspaceId);
  const client = rows[0];
  if (!client) return <main className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text)]"><div className="mx-auto max-w-lg nexor-panel p-8"><h1 className="text-2xl font-semibold">Workspace not found</h1></div></main>;
  const checklist = client.checklist && typeof client.checklist === 'object' ? client.checklist as Record<string, boolean> : {};
  const done = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(checklist).length;
  return <main className="min-h-screen bg-[var(--bg)] p-6 text-[var(--text)] md:p-10"><div className="mx-auto max-w-5xl space-y-5"><header className="nexor-panel p-6"><div className="font-mono text-[8px] tracking-[.2em] text-[var(--accent)]">NEXOR · CLIENT PORTAL</div><h1 className="mt-2 text-3xl font-semibold">Welcome, {client.client_name}</h1><p className="mt-2 text-[10px] text-[var(--text-secondary)]">Your workspace is currently <strong>{client.status}</strong>. This portal exposes client-facing information only.</p></header><section className="grid gap-4 md:grid-cols-3"><div className="nexor-panel p-5"><div className="font-mono text-[7px] text-[var(--text-muted)]">STATUS</div><div className="mt-2 text-xl font-semibold">{client.status}</div></div><div className="nexor-panel p-5"><div className="font-mono text-[7px] text-[var(--text-muted)]">ONBOARDING</div><div className="mt-2 text-xl font-semibold">{done}/{total}</div></div><div className="nexor-panel p-5"><div className="font-mono text-[7px] text-[var(--text-muted)]">SERVICES</div><div className="mt-2 text-sm font-semibold">{Array.isArray(client.services) && client.services.length ? client.services.join(', ') : 'To be confirmed'}</div></div></section><section className="nexor-panel p-6"><div className="text-[11px] font-semibold">Onboarding progress</div><div className="mt-4 space-y-2">{Object.entries(checklist).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3"><span className="text-[9px] capitalize">{key.replace(/[A-Z]/g, m => ` ${m}`)}</span><span className={value ? 'text-[8px] text-emerald-500' : 'text-[8px] text-[var(--text-muted)]'}>{value ? 'COMPLETE' : 'PENDING'}</span></div>)}</div></section></div></main>;
}
