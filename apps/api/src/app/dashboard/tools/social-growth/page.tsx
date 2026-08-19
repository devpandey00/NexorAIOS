'use client';

import { useState } from 'react';
import LeadFinderWorkspace from '@/components/dashboard/LeadFinderWorkspace';
import SocialContentWorkspace from '@/components/dashboard/SocialContentWorkspace';
import WhatsAppAutomationPage from '../whatsapp-automation/page';

type Tab = 'LEADS' | 'CONTENT' | 'OUTREACH';

const tabs: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'LEADS', label: 'Social Lead Finder', description: 'Find businesses and enrich their public social profiles.' },
  { id: 'CONTENT', label: 'SMM Manager', description: 'Generate, approve and schedule social content.' },
  { id: 'OUTREACH', label: 'Outreach Sender', description: 'Personalize, approve, schedule and send outreach.' },
];

export default function SocialGrowthPage() {
  const [tab, setTab] = useState<Tab>('LEADS');

  return (
    <main className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXOR GROWTH ENGINE</div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Social media → leads → outreach → content</h1>
            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-secondary)]">
              One workspace for prospect discovery, public social-profile enrichment, AI content, and approval-first outreach.
              Email and WhatsApp can send automatically; cold social DMs stay in a controlled queue because platform APIs do not provide unrestricted outbound messaging to arbitrary profiles.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-[8px] font-mono tracking-[0.08em] text-emerald-500">ENGINE READY</div>
        </div>

        <div className="mt-6 grid gap-2 md:grid-cols-3">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-xl border p-4 text-left transition ${active ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/20'}`}
              >
                <div className={`font-mono text-[7px] tracking-[0.12em] ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{item.id}</div>
                <div className="mt-2 text-[11px] font-semibold text-[var(--text)]">{item.label}</div>
                <div className="mt-1 text-[8px] leading-4 text-[var(--text-muted)]">{item.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      {tab === 'LEADS' && <LeadFinderWorkspace />}
      {tab === 'CONTENT' && <SocialContentWorkspace />}
      {tab === 'OUTREACH' && <WhatsAppAutomationPage />}
    </main>
  );
}
