'use client';

import { useEffect, useMemo, useState } from 'react';

type Lead = {
  id: string;
  businessName: string;
  ownerName: string | null;
  niche: string;
  country: string;
  website: string | null;
  email: string | null;
  whatsapp: string | null;
  auditScore: number | null;
  status: string;
  createdAt: string;
};

type Draft = {
  id: string;
  channel: string;
  status: string;
  message: string;
  lead: Lead;
};

export default function LeadInboxWorkspace() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [leadResponse, draftResponse] = await Promise.all([
        fetch('/api/leads', { cache: 'no-store' }),
        fetch('/api/outreach/drafts', { cache: 'no-store' }),
      ]);
      const leadData = await leadResponse.json();
      const draftData = await draftResponse.json();
      if (!leadResponse.ok) throw new Error(leadData.message ?? 'Unable to load CRM leads');
      setLeads(leadData.data ?? []);
      setDrafts(draftData.drafts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) => `${lead.businessName} ${lead.ownerName ?? ''} ${lead.niche} ${lead.country} ${lead.status}`.toLowerCase().includes(q));
  }, [leads, query]);

  async function approve(id: string) {
    const response = await fetch('/api/outreach/drafts', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    const data = await response.json();
    setMessage(response.ok && data.success ? 'Draft approved.' : data.error ?? 'Approval failed');
    await load();
  }

  return (
    <section className="space-y-5">
      <div className="nexor-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">SALES & CRM</div>
            <h2 className="mt-2 text-xl font-semibold">Lead Inbox</h2>
            <p className="mt-1 text-[9px] leading-5 text-[var(--text-secondary)]">Live CRM leads, scores, contactability and outreach approval queue.</p>
          </div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">{loading ? 'LOADING…' : 'REFRESH'}</button>
        </div>
        <div className="mt-4 flex gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business, niche, country or status" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[9px] text-[var(--text)] outline-none" />
          <div className="rounded-xl border border-[var(--border)] px-4 py-3 font-mono text-[8px] text-[var(--text-muted)]">{visible.length} LEADS</div>
        </div>
        {message && <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}
      </div>

      <div className="grid gap-3">
        {visible.map((lead) => (
          <article key={lead.id} className="nexor-panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[11px] font-semibold">{lead.businessName}</h3>
                  <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px]">{lead.status}</span>
                  {lead.auditScore !== null && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[7px] text-[var(--accent)]">SCORE {lead.auditScore}</span>}
                </div>
                <div className="mt-2 text-[8px] text-[var(--text-muted)]">{lead.niche} · {lead.country} · {lead.ownerName ?? 'Owner not identified'}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-[8px] text-[var(--text-secondary)]">
                  {lead.website && <a className="rounded-lg border border-[var(--border)] px-3 py-2" href={lead.website} target="_blank" rel="noreferrer">Website ↗</a>}
                  {lead.email && <span className="rounded-lg border border-[var(--border)] px-3 py-2">{lead.email}</span>}
                  {lead.whatsapp && <span className="rounded-lg border border-[var(--border)] px-3 py-2">WA {lead.whatsapp}</span>}
                </div>
              </div>
            </div>
          </article>
        ))}
        {!loading && !visible.length && <div className="nexor-panel p-10 text-center text-[9px] text-[var(--text-muted)]">No CRM leads found. Run Lead Finder or Sales Machine first.</div>}
      </div>

      <section className="nexor-panel overflow-hidden">
        <div className="border-b border-[var(--border)] p-5"><div className="text-[11px] font-semibold">Outreach approval queue</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Approve drafts here before any sender is allowed to send.</div></div>
        <div className="divide-y divide-[var(--border)]">
          {drafts.map((draft) => (
            <article key={draft.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div><div className="flex flex-wrap items-center gap-2"><strong className="text-[9px]">{draft.lead.businessName}</strong><span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{draft.channel}</span><span className="text-[7px] text-[var(--text-muted)]">{draft.status}</span></div><p className="mt-3 max-w-4xl whitespace-pre-wrap text-[9px] leading-5 text-[var(--text-secondary)]">{draft.message}</p></div>
                {['DRAFT', 'APPROVAL_REQUIRED'].includes(draft.status) && <button type="button" onClick={() => void approve(draft.id)} className="h-fit rounded-lg bg-[var(--accent)] px-3 py-2 text-[7px] font-bold text-black">APPROVE</button>}
              </div>
            </article>
          ))}
          {!drafts.length && <div className="p-10 text-center text-[9px] text-[var(--text-muted)]">No outreach drafts waiting for approval.</div>}
        </div>
      </section>
    </section>
  );
}
