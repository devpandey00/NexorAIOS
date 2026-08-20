'use client';

import { useState } from 'react';
import SocialContentWorkspace from '@/components/dashboard/SocialContentWorkspace';
import SocialLeadQueue from '@/components/dashboard/SocialLeadQueue';
import WhatsAppAutomationPage from '../whatsapp-automation/page';

type Tab = 'LEADS' | 'CONTENT' | 'OUTREACH' | 'JOBS';

const tabs: Array<{ id: Tab; label: string; description: string }> = [
  { id: 'LEADS', label: 'Social Lead Finder', description: 'Find businesses and enrich their public social profiles.' },
  { id: 'CONTENT', label: 'SMM Manager', description: 'Generate, approve and schedule social content.' },
  { id: 'OUTREACH', label: 'Outreach Sender', description: 'Personalize, approve, schedule and send outreach.' },
  { id: 'JOBS', label: 'Job Autopilot', description: 'Find roles, score fit, prepare applications and track submissions.' },
];

export default function SocialGrowthPage() {
  const [tab, setTab] = useState<Tab>('LEADS');

  return (
    <main className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXOR GROWTH ENGINE</div>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Social media → leads → outreach → jobs → content</h1>
            <p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-secondary)]">One workspace for prospect discovery, public social-profile enrichment, AI content, job discovery and approval-first outreach. Email and WhatsApp can send through configured providers; arbitrary cold social DMs remain controlled because platform APIs do not provide unrestricted outbound messaging.</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3 text-[8px] font-mono tracking-[0.08em] text-emerald-500">ENGINE READY</div>
        </div>
        <div className="mt-6 grid gap-2 md:grid-cols-4">
          {tabs.map((item) => {
            const active = tab === item.id;
            return <button key={item.id} type="button" onClick={() => item.id === 'JOBS' ? (window.location.href = '/dashboard/tools/job-autopilot') : setTab(item.id)} className={`rounded-xl border p-4 text-left transition ${active ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/20'}`}><div className={`font-mono text-[7px] tracking-[0.12em] ${active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>{item.id}</div><div className="mt-2 text-[11px] font-semibold text-[var(--text)]">{item.label}</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-muted)]">{item.description}</div></button>;
          })}
        </div>
      </section>
      {tab === 'LEADS' && <SocialLeadQueue />}
      {tab === 'CONTENT' && <SocialContentWorkspace />}
      {tab === 'OUTREACH' && <WhatsAppAutomationPage />}
    </main>
  );
}
