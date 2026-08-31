'use client';

import { useEffect, useState } from 'react';

type SocialProfile = { platform: string; url: string; confidence: number };
type Lead = { id: string; businessName: string; ownerName: string | null; niche: string; country: string; website: string | null; email: string | null; whatsapp: string | null; auditScore: number | null; socialProfiles?: SocialProfile[] };
type Draft = { id: string; channel: string; status: string; message: string; lead: Lead };
type LeadResponse = { data?: Lead[]; message?: string };

const SOCIAL_CHANNELS = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const;
type SocialChannel = (typeof SOCIAL_CHANNELS)[number];

export default function SocialLeadQueue() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [leadResponse, draftResponse] = await Promise.all([fetch('/api/leads', { cache: 'no-store' }), fetch('/api/outreach/drafts', { cache: 'no-store' })]);
      const leadData = (await leadResponse.json()) as LeadResponse;
      const draftData = await draftResponse.json();
      if (!leadResponse.ok) throw new Error(leadData.message ?? 'Unable to load leads');
      setLeads(leadData.data ?? []);
      setDrafts((draftData.drafts ?? []).filter((item: Draft) => SOCIAL_CHANNELS.includes(item.channel as SocialChannel)));
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  const visible = leads.filter((lead) => `${lead.businessName} ${lead.ownerName ?? ''} ${lead.niche} ${lead.country}`.toLowerCase().includes(search.toLowerCase()));

  async function createSocialDraft(leadId: string, channel: SocialChannel) {
    setMessage('Preparing personalized social message…');
    const response = await fetch('/api/outreach/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ leadId, channel, context: 'Reference one concrete public social or website opportunity and keep the first message short, specific and conversational.' }) });
    const data = await response.json();
    setMessage(response.ok && data.success ? `${channel} draft added to the approval queue.` : data.error ?? 'Unable to create draft');
    await load();
  }

  async function createBulkDrafts() {
    setBulkLoading(true); setMessage('Scanning qualified leads and building email/WhatsApp drafts…');
    try {
      const response = await fetch('/api/outreach/bulk-draft', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ limit: 100, channels: ['EMAIL', 'WHATSAPP'] }) });
      const data = await response.json();
      setMessage(response.ok && data.success ? `Bulk outreach ready: ${data.created} drafts created from ${data.scanned} qualified leads (${data.skipped} already had outreach).` : data.error ?? 'Bulk draft generation failed');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBulkLoading(false); }
  }

  async function approve(id: string) {
    const response = await fetch('/api/outreach/drafts', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, action: 'approve' }) });
    const data = await response.json();
    setMessage(response.ok && data.success ? 'Draft approved.' : data.error ?? 'Approval failed');
    await load();
  }

  async function confirmManual(id: string) {
    const response = await fetch(`/api/outreach/${id}/confirm-manual`, { method: 'POST' });
    const data = await response.json();
    setMessage(response.ok && data.success ? 'Manual send confirmed and CRM updated.' : data.error ?? 'Manual confirmation failed');
    await load();
  }

  async function copyMessage(draft: Draft) {
    try {
      await navigator.clipboard.writeText(draft.message);
      setCopiedId(draft.id);
      setMessage(`${draft.channel} message copied. Open the profile and paste it manually.`);
      window.setTimeout(() => setCopiedId((current) => current === draft.id ? null : current), 1800);
    } catch { setMessage('Clipboard access failed. Copy the message manually.'); }
  }

  return (
    <section className="space-y-5">
      <div className="nexor-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">SOCIAL PROSPECT DATABASE</div><h2 className="mt-2 text-xl font-semibold">Find businesses with real social signals.</h2><p className="mt-1 max-w-2xl text-[9px] leading-5 text-[var(--text-secondary)]">Discovery feeds this queue. Public social links are retained for research; AI creates personalized drafts. Cold social DMs use an explicit manual fallback.</p></div><div className="flex gap-2"><button type="button" onClick={() => void createBulkDrafts()} disabled={bulkLoading} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-bold text-black disabled:opacity-50">{bulkLoading ? 'BUILDING…' : 'DRAFT ALL QUALIFIED'}</button><button type="button" onClick={() => void load()} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">{loading ? 'LOADING…' : 'REFRESH'}</button></div></div>
        <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search business, niche or location" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[9px] text-[var(--text)] outline-none" /><div className="rounded-xl border border-[var(--border)] px-4 py-3 font-mono text-[8px] text-[var(--text-muted)]">{visible.length} LEADS</div></div>
        {message && <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}
      </div>

      <div className="grid gap-3">{visible.map((lead) => <article key={lead.id} className="nexor-panel p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[11px] font-semibold text-[var(--text)]">{lead.businessName}</h3><span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{lead.niche}</span><span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{lead.country}</span>{lead.auditScore !== null && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[7px] text-[var(--accent)]">SCORE {lead.auditScore}</span>}</div><div className="mt-2 text-[8px] text-[var(--text-muted)]">{lead.ownerName ?? 'Owner not identified'} · {lead.website ?? 'No website'}</div><div className="mt-4 flex flex-wrap gap-2">{(lead.socialProfiles ?? []).map((profile) => <a key={`${lead.id}-${profile.platform}`} href={profile.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">{profile.platform} ↗</a>)}</div></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void createSocialDraft(lead.id, 'INSTAGRAM')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">IG DRAFT</button><button type="button" onClick={() => void createSocialDraft(lead.id, 'FACEBOOK')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">FB DRAFT</button><button type="button" onClick={() => void createSocialDraft(lead.id, 'LINKEDIN')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">LI DRAFT</button></div></div></article>)}{!visible.length && <div className="nexor-panel p-10 text-center text-[9px] text-[var(--text-muted)]">No leads yet. Run discovery first.</div>}</div>

      <section className="nexor-panel overflow-hidden"><div className="border-b border-[var(--border)] p-5"><div className="text-[11px] font-semibold">Social message approval queue</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Approve a message, open the public profile, copy the message, send it manually when required, then confirm. Provider APIs are never impersonated.</div></div><div className="divide-y divide-[var(--border)]">{drafts.map((draft) => { const profile = (draft.lead.socialProfiles ?? []).find((item) => item.platform === draft.channel); return <article key={draft.id} className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-[9px]">{draft.lead.businessName}</strong><span className="rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{draft.channel}</span><span className="text-[7px] text-[var(--text-muted)]">{draft.status}</span></div><p className="mt-3 max-w-3xl whitespace-pre-wrap text-[9px] leading-5 text-[var(--text-secondary)]">{draft.message}</p></div><div className="flex shrink-0 flex-wrap gap-2">{draft.status === 'DRAFT' && <button type="button" onClick={() => void approve(draft.id)} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[7px] font-bold text-black">APPROVE</button>}{profile && <a href={profile.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">OPEN PROFILE ↗</a>}{draft.status !== 'SENT' && <button type="button" onClick={() => void copyMessage(draft)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">{copiedId === draft.id ? 'COPIED ✓' : 'COPY MESSAGE'}</button>}{draft.status === 'MANUAL_PENDING' && <button type="button" onClick={() => void confirmManual(draft.id)} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[7px] font-bold text-emerald-400">MARK SENT</button>}</div></div></article>; })}{!drafts.length && <div className="p-10 text-center text-[9px] text-[var(--text-muted)]">No social drafts waiting for approval.</div>}</div></section>
    </section>
  );
}
