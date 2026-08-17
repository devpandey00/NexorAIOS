'use client';

import { useEffect, useState } from 'react';

type Lead = { id: string; businessName: string; whatsapp: string | null; niche?: string };
type Draft = { id: string; message: string; status: string; scheduledAt: string | null; lead: Lead };
type Reply = { id: string; status: string; lastMessageAt: string | null; lead: Lead; messages: { direction: string; content: string; createdAt: string }[] };
type Task = { id: string; title: string; description: string | null; priority: number; lead: Lead | null };

type Data = { stats: { drafts: number; scheduled: number; sent: number; failed: number; replies: number }; drafts: Draft[]; scheduled: Draft[]; replies: Reply[]; tasks: Task[] };

export default function WhatsAppAutomationPage() {
  const [data, setData] = useState<Data | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [limit, setLimit] = useState(10);

  async function load() {
    const response = await fetch('/api/whatsapp/automation', { cache: 'no-store' });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error ?? 'Unable to load WhatsApp automation');
    setData(json);
  }

  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : String(error))); }, []);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/whatsapp/automation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ids: selected, ...extra }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error ?? 'Action failed');
      if (action === 'generate') setMessage(`AI prepared ${json.created ?? 0} WhatsApp drafts.`);
      else if (action === 'send') setMessage(`Send complete. ${json.results?.filter((item: { success: boolean }) => item.success).length ?? 0} sent.`);
      else setMessage(`${json.updated ?? 0} item(s) updated.`);
      setSelected([]);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally { setLoading(false); }
  }

  const drafts = data?.drafts ?? [];
  const allSelected = drafts.length > 0 && drafts.every((item) => selected.includes(item.id));

  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }

  return (
    <main className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">WHATSAPP AUTOMATION</div>
        <h1 className="mt-2 text-xl font-semibold">Prospect → Draft → Approve → Schedule → Send → Reply</h1>
        <p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-muted)]">Approval-first WhatsApp outreach with AI personalization, scheduled delivery, inbound webhook classification and follow-up tasks.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {Object.entries(data?.stats ?? { drafts: 0, scheduled: 0, sent: 0, failed: 0, replies: 0 }).map(([key, value]) => <div key={key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="text-[7px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{key}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>)}
        </div>
      </section>

      <section className="nexor-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-[10px] font-semibold">1. Generate personalized drafts</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Uses leads that have WhatsApp numbers and are not already in an active outreach state.</div></div>
          <div className="flex gap-2"><input value={limit} onChange={(e) => setLimit(Number(e.target.value) || 10)} type="number" min={1} max={25} className="w-20 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /><button disabled={loading} onClick={() => run('generate', { limit })} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[8px] font-bold text-black disabled:opacity-50">GENERATE</button></div>
        </div>
      </section>

      <section className="nexor-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div><div className="text-[10px] font-semibold">2. Approval queue</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Nothing sends until you explicitly approve it.</div></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSelected(allSelected ? [] : drafts.map((item) => item.id))} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">{allSelected ? 'CLEAR' : 'SELECT ALL'}</button>
            <button disabled={!selected.length || loading} onClick={() => run('approve')} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-[8px] disabled:opacity-40">APPROVE</button>
            <button disabled={!selected.length || loading} onClick={() => run('cancel')} className="rounded-lg border border-red-500/30 px-3 py-2 text-[8px] disabled:opacity-40">CANCEL</button>
            <button disabled={!selected.length || loading} onClick={() => run('schedule')} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-bold text-black disabled:opacity-40">SCHEDULE</button>
          </div>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {drafts.map((draft) => <article key={draft.id} className="p-5">
            <div className="flex gap-3"><input type="checkbox" checked={selected.includes(draft.id)} onChange={() => toggle(draft.id)} className="mt-1" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-[10px]">{draft.lead.businessName}</strong><span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{draft.lead.whatsapp}</span><span className="text-[7px] text-[var(--text-muted)]">{draft.status}</span></div><p className="mt-3 whitespace-pre-wrap text-[9px] leading-5 text-[var(--text-secondary)]">{draft.message}</p></div></div>
          </article>)}
          {!drafts.length && <div className="p-10 text-center text-[9px] text-[var(--text-muted)]">No WhatsApp drafts waiting for approval.</div>}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="nexor-panel p-5"><div className="text-[10px] font-semibold">3. Scheduled</div><div className="mt-3 space-y-2">{(data?.scheduled ?? []).map((item) => <div key={item.id} className="rounded-xl border border-[var(--border)] p-3"><div className="text-[9px] font-semibold">{item.lead.businessName}</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : 'Pending'}</div></div>)}{!data?.scheduled?.length && <div className="text-[8px] text-[var(--text-muted)]">Nothing scheduled.</div>}</div></div>
        <div className="nexor-panel p-5"><div className="text-[10px] font-semibold">4. Reply intelligence</div><div className="mt-3 space-y-2">{(data?.replies ?? []).map((reply) => <div key={reply.id} className="rounded-xl border border-[var(--border)] p-3"><div className="flex justify-between gap-3"><span className="text-[9px] font-semibold">{reply.lead.businessName}</span><span className="text-[7px] text-[var(--accent)]">{reply.status}</span></div><div className="mt-2 text-[8px] text-[var(--text-muted)]">{reply.messages[0]?.content ?? 'No message preview'}</div></div>)}{!data?.replies?.length && <div className="text-[8px] text-[var(--text-muted)]">No classified replies yet.</div>}</div></div>
      </section>

      <section className="nexor-panel p-5"><div className="text-[10px] font-semibold">5. Manual send / follow-up control</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">For approved items only. Scheduled items are sent by the outreach cron.</div><div className="mt-3 flex flex-wrap gap-2"><button disabled={!selected.length || loading} onClick={() => run('send')} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[8px] font-bold text-black disabled:opacity-40">SEND APPROVED NOW</button><button onClick={() => load()} className="rounded-lg border border-[var(--border)] px-4 py-2 text-[8px]">REFRESH</button></div>{message && <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}</section>
    </main>
  );
}
