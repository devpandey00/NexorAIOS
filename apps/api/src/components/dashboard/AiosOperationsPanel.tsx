'use client';

import { useEffect, useState } from 'react';

type Approval = { id: string; action: string; targetType: string; targetId?: string; payload: Record<string, unknown>; reason?: string; status: string; createdAt: string };

export default function AiosOperationsPanel() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [command, setCommand] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceClient, setInvoiceClient] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [message, setMessage] = useState('');

  async function loadApprovals() {
    const r = await fetch('/api/approvals?status=PENDING', { cache: 'no-store' });
    const j = await r.json();
    if (j.success) setApprovals(j.approvals ?? []);
  }
  useEffect(() => { void loadApprovals(); }, []);

  async function approval(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusy(true); setMessage('');
    try { const r = await fetch('/api/approvals', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) }); const j = await r.json(); if (!j.success) throw new Error(j.error); setMessage(`Approval ${status.toLowerCase()}.`); await loadApprovals(); } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  async function runCommand() {
    if (!command.trim()) return; setBusy(true); setAnswer('');
    try { const r = await fetch('/api/ai/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command }) }); const j = await r.json(); setAnswer(j.success ? j.answer : `Error: ${j.error}`); } catch (e) { setAnswer(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  async function createClient() {
    if (!clientName.trim()) return; setBusy(true);
    try { const r = await fetch('/api/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientName, clientEmail }) }); const j = await r.json(); setMessage(j.success ? 'Client workspace created in ONBOARDING.' : j.error); if (j.success) { setClientName(''); setClientEmail(''); } } finally { setBusy(false); }
  }

  async function createInvoice() {
    const amount = Number(invoiceAmount); if (!invoiceClient.trim() || !Number.isFinite(amount) || amount <= 0) return; setBusy(true);
    try { const r = await fetch('/api/invoices', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientName: invoiceClient, items: [{ description: 'Nexor service', quantity: 1, unitPrice: amount }] }) }); const j = await r.json(); setMessage(j.success ? `Invoice ${j.invoiceNumber} created for ₹${j.total}.` : j.error); if (j.success) { setInvoiceClient(''); setInvoiceAmount(''); } } finally { setBusy(false); }
  }

  return <section className="grid gap-4 xl:grid-cols-2">
    <div id="approvals" className="nexor-panel p-5"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold">Approval Center</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">External actions stay gated until approved.</div></div><span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 font-mono text-[7px] text-[var(--accent)]">{approvals.length} PENDING</span></div><div className="mt-4 space-y-2">{approvals.length ? approvals.slice(0, 8).map(a => <div key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-[9px] font-semibold">{a.action}</div><div className="mt-1 text-[7px] text-[var(--text-muted)]">{a.targetType}{a.targetId ? ` · ${a.targetId}` : ''}</div></div><div className="flex gap-2"><button disabled={busy} onClick={() => approval(a.id, 'APPROVED')} className="rounded-lg border border-emerald-500/20 px-2 py-1 text-[7px] text-emerald-500">Approve</button><button disabled={busy} onClick={() => approval(a.id, 'REJECTED')} className="rounded-lg border border-red-500/20 px-2 py-1 text-[7px] text-red-400">Reject</button></div></div></div>) : <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-[8px] text-[var(--text-muted)]">No pending approvals.</div>}</div></div>
    <div className="nexor-panel p-5"><div className="text-[11px] font-semibold">AI CEO Command</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Ask against real NexorAIOS data.</div><div className="mt-4 flex gap-2"><input value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void runCommand(); }} placeholder="Show today's hottest leads…" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px] outline-none" /><button disabled={busy} onClick={() => void runCommand()} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-[8px] font-semibold text-black">Run</button></div>{answer && <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 font-mono text-[8px] leading-4 text-[var(--text-secondary)]">{answer}</pre>}</div>
    <div id="clients" className="nexor-panel p-5"><div className="text-[11px] font-semibold">Client Onboarding</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Create a secure workspace and begin the checklist.</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /><input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Client email (optional)" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /></div><button disabled={busy} onClick={() => void createClient()} className="mt-3 rounded-xl border border-[var(--accent)]/30 px-4 py-2 text-[8px] text-[var(--accent)]">Create workspace</button></div>
    <div id="finance" className="nexor-panel p-5"><div className="text-[11px] font-semibold">Invoice Quick Create</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Creates a DRAFT only; payment is never assumed.</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={invoiceClient} onChange={e => setInvoiceClient(e.target.value)} placeholder="Client name" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /><input value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} placeholder="Amount ₹" inputMode="decimal" className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px]" /></div><button disabled={busy} onClick={() => void createInvoice()} className="mt-3 rounded-xl border border-[var(--accent)]/30 px-4 py-2 text-[8px] text-[var(--accent)]">Create draft invoice</button></div>
    {message && <div className="xl:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}
  </section>;
}
