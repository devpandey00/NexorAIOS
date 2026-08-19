'use client';

import { useCallback, useEffect, useState } from 'react';

// Live CRM pipeline: discovery output -> database -> approval queue.
type Lead = {
  id: string;
  businessName: string;
  niche: string;
  country: string;
  website?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  auditScore?: number | null;
  status: string;
  notes?: string | null;
};

type Draft = {
  id: string;
  channel: string;
  status: string;
  message: string;
  lead: { id: string; businessName: string; email?: string | null; whatsapp?: string | null };
};

export default function LeadPipelineWorkspace() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leadResponse, draftResponse] = await Promise.all([fetch('/api/leads', { cache: 'no-store' }), fetch('/api/outreach', { cache: 'no-store' })]);
      const leadData = await leadResponse.json();
      const draftData = await draftResponse.json();
      if (!leadResponse.ok || leadData.success === false) throw new Error(leadData.message ?? 'Could not load leads');
      if (!draftResponse.ok || draftData.success === false) throw new Error(draftData.error ?? 'Could not load outreach drafts');
      setLeads(Array.isArray(leadData.data) ? leadData.data : Array.isArray(leadData.leads) ? leadData.leads : []);
      setDrafts(Array.isArray(draftData.drafts) ? draftData.drafts : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(id);
    setError('');
    try {
      const response = await fetch('/api/outreach', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Approval action failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const qualified = leads.filter((lead) => ['QUALIFIED', 'PITCH_READY'].includes(lead.status));

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="TOTAL LEADS" value={leads.length} />
        <Metric label="QUALIFIED" value={qualified.length} />
        <Metric label="DRAFTS" value={drafts.length} />
        <Metric label="HIGH SCORE" value={leads.filter((lead) => (lead.auditScore ?? 0) >= 70).length} />
      </div>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-[9px] text-red-500">{error}</div>}
      <div className="nexor-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
          <div><div className="text-[11px] font-semibold text-[var(--text)]">Live Lead Pipeline</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Real database records created by discovery and sales workflows.</div></div>
          <button onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] font-semibold text-[var(--text)]">{loading ? 'Refreshing…' : 'Refresh'}</button>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {!loading && leads.length === 0 && <div className="p-8 text-center text-[9px] text-[var(--text-muted)]">No leads in the database yet. Run Lead Finder or Sales Machine first.</div>}
          {leads.map((lead) => (
            <div key={lead.id} className="grid gap-3 p-5 lg:grid-cols-[1.4fr_.6fr_.7fr]">
              <div><div className="text-[11px] font-semibold text-[var(--text)]">{lead.businessName}</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{lead.niche} · {lead.country}</div><div className="mt-2 flex flex-wrap gap-2 text-[8px] text-[var(--text-secondary)]">{lead.website && <span>Web ✓</span>}{lead.email && <span>Email ✓</span>}{lead.whatsapp && <span>WhatsApp ✓</span>}{lead.instagram && <span>Instagram ✓</span>}{lead.linkedin && <span>LinkedIn ✓</span>}</div></div>
              <div><div className="font-mono text-[7px] text-[var(--text-muted)]">SCORE</div><div className="mt-1 text-xl font-semibold text-[var(--text)]">{lead.auditScore ?? '—'}<span className="text-[8px] text-[var(--text-muted)]">/100</span></div></div>
              <div><div className="font-mono text-[7px] text-[var(--text-muted)]">STATUS</div><div className="mt-1 inline-flex rounded-full border border-[var(--border)] px-2 py-1 text-[7px] font-semibold text-[var(--text)]">{lead.status}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div className="nexor-panel overflow-hidden">
        <div className="border-b border-[var(--border)] p-5"><div className="text-[11px] font-semibold text-[var(--text)]">Outreach Approval Queue</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Drafts are never sent automatically. Approve them explicitly before queueing.</div></div>
        <div className="divide-y divide-[var(--border)]">
          {!loading && drafts.length === 0 && <div className="p-8 text-center text-[9px] text-[var(--text-muted)]">No outreach drafts waiting for approval.</div>}
          {drafts.map((draft) => (
            <div key={draft.id} className="p-5"><div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><div className="text-[10px] font-semibold text-[var(--text)]">{draft.lead.businessName}</div><div className="mt-1 font-mono text-[7px] tracking-[0.12em] text-[var(--accent)]">{draft.channel} · {draft.status}</div></div><div className="flex gap-2"><button disabled={busy === draft.id} onClick={() => void decide(draft.id, 'reject')} className="rounded-lg border border-red-500/20 px-3 py-2 text-[8px] text-red-500">Reject</button><button disabled={busy === draft.id} onClick={() => void decide(draft.id, 'approve')} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-bold text-black">{busy === draft.id ? 'Working…' : 'Approve'}</button></div></div><div className="mt-3 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-[9px] leading-5 text-[var(--text-secondary)]">{draft.message}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="nexor-panel p-4"><div className="font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">{label}</div><div className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</div></div>;
}
