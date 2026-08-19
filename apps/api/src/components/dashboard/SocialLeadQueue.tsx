'use client';

import { useEffect, useState } from 'react';

type SocialProfile = { platform: string; url: string; confidence: number };
type Lead = { id: string; businessName: string; ownerName: string | null; niche: string; country: string; website: string | null; email: string | null; whatsapp: string | null; auditScore: number | null; socialProfiles?: SocialProfile[] };

type LeadResponse = { data?: Lead[]; meta?: { total?: number }; success?: boolean; message?: string };

export default function SocialLeadQueue() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/leads', { cache: 'no-store' });
      const data = (await response.json()) as LeadResponse;
      if (!response.ok) throw new Error(data.message ?? 'Unable to load leads');
      setLeads(data.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const visible = leads.filter((lead) => `${lead.businessName} ${lead.ownerName ?? ''} ${lead.niche} ${lead.country}`.toLowerCase().includes(search.toLowerCase()));

  async function createSocialDraft(leadId: string, channel: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN') {
    setMessage('Preparing personalized social message…');
    const response = await fetch('/api/outreach/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ leadId, channel, context: 'Reference one concrete public social or website opportunity and keep the first message short, specific and conversational.' }),
    });
    const data = await response.json();
    setMessage(response.ok && data.success ? `${channel} draft added to the approval queue.` : data.error ?? 'Unable to create draft');
  }

  return (
    <section className="space-y-5">
      <div className="nexor-panel p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--accent)]">SOCIAL PROSPECT DATABASE</div><h2 className="mt-2 text-xl font-semibold">Find businesses with real social signals.</h2><p className="mt-1 max-w-2xl text-[9px] leading-5 text-[var(--text-secondary)]">The discovery engine feeds leads into this queue. Public Instagram, Facebook, LinkedIn and YouTube links are retained with each lead for outreach research.</p></div>
          <button type="button" onClick={() => void load()} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">{loading ? 'LOADING…' : 'REFRESH'}</button>
        </div>
        <div className="mt-4 flex gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search business, niche or location" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[9px] text-[var(--text)] outline-none" /><div className="rounded-xl border border-[var(--border)] px-4 py-3 font-mono text-[8px] text-[var(--text-muted)]">{visible.length} LEADS</div></div>
        {message && <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] text-[var(--text-secondary)]">{message}</div>}
      </div>

      <div className="grid gap-3">
        {visible.map((lead) => (
          <article key={lead.id} className="nexor-panel p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[11px] font-semibold text-[var(--text)]">{lead.businessName}</h3><span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{lead.niche}</span><span className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{lead.country}</span>{lead.auditScore !== null && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[7px] text-[var(--accent)]">SCORE {lead.auditScore}</span>}</div><div className="mt-2 text-[8px] text-[var(--text-muted)]">{lead.ownerName ?? 'Owner not identified'} · {lead.website ?? 'No website'}</div>
                <div className="mt-4 flex flex-wrap gap-2">{(lead.socialProfiles ?? []).map((profile) => <a key={`${lead.id}-${profile.platform}`} href={profile.url} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)]">{profile.platform} ↗</a>)}{lead.instagram && !(lead.socialProfiles ?? []).some((item) => item.platform === 'INSTAGRAM') && <a href={lead.instagram} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">INSTAGRAM ↗</a>}</div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void createSocialDraft(lead.id, 'INSTAGRAM')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">IG DRAFT</button><button type="button" onClick={() => void createSocialDraft(lead.id, 'FACEBOOK')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">FB DRAFT</button><button type="button" onClick={() => void createSocialDraft(lead.id, 'LINKEDIN')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[7px]">LI DRAFT</button></div>
            </div>
          </article>
        ))}
        {!visible.length && <div className="nexor-panel p-10 text-center text-[9px] text-[var(--text-muted)]">No leads yet. Run discovery first.</div>}
      </div>
    </section>
  );
}
