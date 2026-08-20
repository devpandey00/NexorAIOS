'use client';

import { useEffect, useState } from 'react';

type Lead = { id: string; businessName: string; whatsapp: string | null; niche?: string };
type Draft = { id: string; message: string; status: string; scheduledAt: string | null; lead: Lead };
type Reply = { id: string; status: string; lastMessageAt: string | null; lead: Lead; messages: { direction: string; content: string; createdAt: string }[] };
type Task = { id: string; title: string; description: string | null; priority: number; lead: Lead | null };
type Notice = { id: string; businessName: string; reason: string };
type Data = { stats: { drafts: number; approved: number; scheduled: number; sent: number; failed: number; replies: number; notContactable: number; rejected: number }; drafts: Draft[]; approved: Draft[]; scheduled: Draft[]; rejected: Notice[]; notContactable: Notice[]; replies: Reply[]; tasks: Task[] };

export default function WhatsAppAutomationPage() {
  const [data, setData] = useState<Data | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(10);

  async function load(clearSelection = true) {
    const response = await fetch('/api/whatsapp/automation', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error ?? 'Unable to load WhatsApp automation');
    setData(json);
    if (clearSelection) setSelectedDrafts(new Set());
  }

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : String(error))); }, []);

  async function run(action: string, ids: string[], extra: Record<string, unknown> = {}) {
    if (action !== 'generate' && ids.length === 0) return;
    setLoading(true); setMessage('');
    try {
      const response = await fetch('/api/whatsapp/automation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ids, ...extra }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? 'Action failed');
      if (action === 'generate') {
        const parts = [`AI prepared ${json.created ?? 0} personalized drafts.`];
        if (json.notContactable?.length) parts.push(`${json.notContactable.length} NOT CONTACTABLE.`);
        if (json.rejected?.length) parts.push(`${json.rejected.length} blocked.`);
        setMessage(parts.join(' '));
      } else if (action === 'approve') setMessage(`${json.updated ?? 0} approved. Automatic send queued for ${json.autoSendAt ? new Date(json.autoSendAt).toLocaleTimeString() : 'the next cron run'}.`);
      else setMessage(`${json.updated ?? 0} item(s) updated.`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(false); }
  }

  const drafts = data?.drafts ?? [];
  const approved = data?.approved ?? [];
  const allDraftsSelected = drafts.length > 0 && drafts.every((item) => selectedDrafts.has(item.id));

  function toggleDraft(id: string) { setSelectedDrafts((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  function selectAllDrafts() { setSelectedDrafts(allDraftsSelected ? new Set() : new Set(drafts.map((item) => item.id))); }

  const Check = ({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) => (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggle(); }} disabled={loading} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold transition ${checked ? 'border-[var(--accent)] bg-[var(--accent)] text-black' : 'border-[var(--border)] bg-transparent text-transparent hover:border-[var(--accent)]'} disabled:cursor-not-allowed disabled:opacity-50`}>✓</button>
  );

  return (
    <main className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">WHATSAPP AUTOMATION</div>
        <h1 className="mt-2 text-xl font-semibold">Prospect → Validate → Draft → Approve → Auto-Send → Reply</h1>
        <p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-muted)]">Trial mode: you manually approve drafts. After approval, Nexor automatically queues and sends them. No manual scheduling or sending is required.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4 lg:grid-cols-8">{Object.entries(data?.stats ?? { drafts: 0, approved: 0, scheduled: 0, sent: 0, failed: 0, replies: 0, notContactable: 0, rejected: 0 }).map(([key, value]) => <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="text-[7px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{key}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>)}</div>
      </section>

      <section className="nexor-panel p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-[10px] font-semibold">1. Generate personalized drafts</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Research-backed, unique per business. Existing active outreach is skipped.</div></div><div className="flex gap-2"><input value={limit} onChange={(e) => setLimit(Math.min(25, Math.max(1, Number(e.target.value) || 10)))} type="number" min={1} max={25} className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /><button type="button" disabled={loading} onClick={() => void run('generate', [], { limit })} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[8px] font-bold text-black disabled:opacity-50">GENERATE</button></div></div></section>

      <section className="nexor-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><div className="text-[10px] font-semibold">2. Approval queue — YOUR ONLY MANUAL STEP</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Select drafts and approve them. Everything after approval is automatic.</div></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!drafts.length || loading} onClick={selectAllDrafts} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] disabled:opacity-40">{allDraftsSelected ? 'CLEAR ALL' : 'SELECT ALL'}</button><button type="button" disabled={!selectedDrafts.size || loading} onClick={() => void run('approve', [...selectedDrafts])} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-[8px] disabled:opacity-40">APPROVE</button><button type="button" disabled={!selectedDrafts.size || loading} onClick={() => void run('cancel', [...selectedDrafts])} className="rounded-lg border border-red-500/30 px-3 py-2 text-[8px] disabled:opacity-40">CANCEL</button></div></div>
        <div className="divide-y divide-[var(--border)]">{drafts.map((draft) => <article key={draft.id} className="p-5"><div className="flex gap-3"><Check checked={selectedDrafts.has(draft.id)} onToggle={() => toggleDraft(draft.id)} label={`Select ${draft.lead.businessName}`} /><button type="button" disabled={loading} onClick={() => toggleDraft(draft.id)} className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-not-allowed"><span className="flex flex-wrap items-center gap-2"><strong className="text-[10px]">{draft.lead.businessName}</strong><span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{draft.lead.whatsapp || 'NOT CONTACTABLE'}</span><span className="text-[7px] text-[var(--text-muted)]">{draft.status}</span></span><span className="mt-3 block whitespace-pre-wrap text-[9px] leading-5 text-[var(--text-secondary)]">{draft.message}</span></button></div></article>)}{!drafts.length && <div className="p-10 text-center text-[9px] text-[var(--text-muted)]">No WhatsApp drafts waiting for approval.</div>}</div>
      </section>

      <section className="nexor-panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5"><div><div className="text-[10px] font-semibold">3. Approved — AUTOMATIC SEND QUEUE</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Approved messages remain here until the automated sender processes them. No SEND button.</div></div></div><div className="divide-y divide-[var(--border)]">{approved.map((item) => <article key={item.id} className="p-5"><div className="flex gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 text-[11px] font-bold text-emerald-400">✓</span><div className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-[10px]">{item.lead.businessName}</strong><span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{item.lead.whatsapp}</span><span className="text-[7px] text-emerald-400">APPROVED • AUTO-SEND</span></span><span className="mt-2 block text-[7px] text-[var(--text-muted)]">Automatic send: {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'next cron run'}</span><span className="mt-3 block whitespace-pre-wrap text-[9px] leading-5 text-[var(--text-secondary)]">{item.message}</span></div></div></article>)}{!approved.length && <div className="p-10 text-center text-[9px] text-[var(--text-muted)]">Nothing awaiting automatic send.</div>}</div></section>

      <section className="grid gap-5 lg:grid-cols-3"><div className="nexor-panel p-5"><div className="text-[10px] font-semibold">4. Scheduled</div><div className="mt-3 space-y-2">{(data?.scheduled ?? []).map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] p-3"><div className="text-[9px] font-semibold">{item.lead.businessName}</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'Pending'}</div></div>)}{!data?.scheduled?.length && <div className="text-[8px] text-[var(--text-muted)]">Nothing scheduled.</div>}</div></div><div className="nexor-panel p-5"><div className="text-[10px] font-semibold">5. Contactability / blocked</div><div className="mt-3 space-y-2">{[...(data?.notContactable ?? []), ...(data?.rejected ?? [])].slice(0, 30).map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] p-3"><div className="text-[9px] font-semibold">{item.businessName}</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{item.reason}</div></div>)}{!(data?.notContactable?.length || data?.rejected?.length) && <div className="text-[8px] text-[var(--text-muted)]">Nothing blocked.</div>}</div></div><div className="nexor-panel p-5"><div className="text-[10px] font-semibold">6. Reply intelligence</div><div className="mt-3 space-y-2">{(data?.replies ?? []).map((reply) => <div key={reply.id} className="rounded-xl border border-[var(--border)] p-3"><div className="flex justify-between gap-3"><span className="text-[9px] font-semibold">{reply.lead.businessName}</span><span className="text-[7px] text-[var(--accent)]">{reply.status}</span></div><div className="mt-2 text-[8px] text-[var(--text-muted)]">{reply.messages[0]?.content ?? 'No message preview'}</div></div>)}{!data?.replies?.length && <div className="text-[8px] text-[var(--text-muted)]">No classified replies yet.</div>}</div></div></section>

      <section className="nexor-panel p-5"><div className="text-[10px] font-semibold">7. Provider / cron status</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Vercel cron processes approved items automatically. Manual scheduling and manual sending are disabled.</div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void load(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-[8px]">REFRESH</button></div>{message && <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}</section>
    </main>
  );
}
