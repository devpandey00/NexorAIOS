import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import LeadFinderWorkspace from '@/components/dashboard/LeadFinderWorkspace';
import LeadInboxWorkspace from '@/components/dashboard/LeadInboxWorkspace';
import SocialContentWorkspace from '@/components/dashboard/SocialContentWorkspace';
import SocialLeadQueue from '@/components/dashboard/SocialLeadQueue';
import GrowthAutomationClient from '@/components/dashboard/GrowthAutomationClient';
import WhatsAppAutomationPage from '../whatsapp-automation/page';
import JobAutopilotPage from '../job-autopilot/page';
import VideoAgentPage from '../../video-agent/page';
import { getTool } from '@/lib/dashboard-tools';

const customModes: Record<string, 'AUTOPILOT' | 'JOB' | 'COMPANY' | 'INFLUENCER' | 'MESSAGE' | 'SOCIAL'> = {
  autopilot: 'AUTOPILOT',
  'job-search': 'JOB',
  'company-prospecting': 'COMPANY',
  'influencer-prospecting': 'INFLUENCER',
  'message-drafter': 'MESSAGE',
  'social-media-manager': 'SOCIAL',
};

const customTitles: Record<string, string> = {
  autopilot: 'Autopilot Command',
  'job-search': 'Job Search Autopilot',
  'company-prospecting': 'Company Prospecting',
  'influencer-prospecting': 'Influencer Prospecting',
  'message-drafter': 'Message Drafter',
  'social-media-manager': 'Social Media Manager',
};

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const customMode = customModes[slug];
  const tool = getTool(slug);

  if (slug === 'social-growth') {
    return <DashboardLayout><main className="space-y-5"><section className="nexor-panel p-6"><div className="font-mono text-[7px] tracking-[0.18em] text-[var(--accent)]">NEXOR GROWTH ENGINE</div><h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Social media → leads → outreach → content</h1><p className="mt-2 max-w-3xl text-[9px] leading-5 text-[var(--text-secondary)]">Unified social lead discovery, public-profile research, AI content and approval-first outreach.</p></section><SocialLeadQueue /><SocialContentWorkspace /></main></DashboardLayout>;
  }

  if (slug === 'lead-finder') {
    return <DashboardLayout><main className="space-y-5"><section className="nexor-fade nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">LEAD GENERATION</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Lead Finder</h1><p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Targeted discovery → research → scoring → requirement matching → personalized drafts.</p></div></section><LeadFinderWorkspace /></main></DashboardLayout>;
  }

  if (slug === 'lead-inbox') {
    return <DashboardLayout><main className="space-y-5"><section className="nexor-fade nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">SALES & CRM</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Lead Inbox</h1><p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Live CRM leads, scores, contactability and approval-first outreach.</p></div></section><LeadInboxWorkspace /></main></DashboardLayout>;
  }

  if (slug === 'content-calendar') {
    return <DashboardLayout><main className="space-y-5"><section className="nexor-fade nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">SOCIAL MEDIA</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Content Calendar</h1></div></section><SocialContentWorkspace /></main></DashboardLayout>;
  }

  // All WhatsApp workflow entry points use the same live approval → auto-send workspace.
  // whatsapp-sending was previously falling through to the generic "Architecture ready"
  // placeholder, which made the sidebar appear stuck even though the automation backend worked.
  if (slug === 'whatsapp-automation' || slug === 'whatsapp-drafts' || slug === 'whatsapp-sending' || slug === 'message-sender') {
    return <DashboardLayout><WhatsAppAutomationPage /></DashboardLayout>;
  }

  if (slug === 'messenger') {
    return <DashboardLayout><main className="space-y-5"><section className="nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">MESSAGING</div><h1 className="mt-1 text-3xl font-semibold text-[var(--text)]">Messenger</h1><p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">Unified conversation and approval workspace. Facebook Messenger delivery is provider-configured; CRM conversations remain available without fake provider success.</p></div></section><LeadInboxWorkspace /></main></DashboardLayout>;
  }

  if (slug === 'project-finder') {
    return <DashboardLayout><JobAutopilotPage /></DashboardLayout>;
  }

  if (slug === 'video-editing') {
    return <DashboardLayout><VideoAgentPage /></DashboardLayout>;
  }

  if (customMode) {
    const title = tool?.name ?? customTitles[slug] ?? slug;
    const group = tool?.group ?? (customMode === 'SOCIAL' ? 'Social Media' : customMode === 'MESSAGE' ? 'WhatsApp & Email' : 'Command & Autopilot');
    const description = tool?.description ?? `Live ${title.toLowerCase()} workspace inside NexorAIOS.`;
    return <DashboardLayout><main className="space-y-5"><section className="nexor-fade nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{group.toUpperCase()}</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{title}</h1><p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">{description}</p></div></section><GrowthAutomationClient mode={customMode} /></main></DashboardLayout>;
  }

  if (!tool) {
    return <DashboardLayout><section className="nexor-panel p-8"><div className="font-mono text-[8px] tracking-[0.16em] text-[var(--text-muted)]">TOOL NOT FOUND</div><h1 className="mt-3 text-3xl font-semibold text-[var(--text)]">Unknown Nexor tool</h1><p className="mt-2 text-[10px] text-[var(--text-secondary)]">Return to the Tool Universe and choose an available module.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2 text-[9px] font-bold text-black">BACK TO COMMAND CENTER</Link></section></DashboardLayout>;
  }

  return <DashboardLayout><main className="space-y-5"><section className="nexor-fade nexor-panel p-7"><Link href="/dashboard" className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">← COMMAND CENTER</Link><div className="mt-5"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{tool.group.toUpperCase()}</div><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{tool.name}</h1><p className="mt-4 max-w-2xl text-[10px] leading-5 text-[var(--text-secondary)]">{tool.description}</p></div><div className="mt-5 inline-flex rounded-full bg-[var(--surface-3)] px-3 py-1.5 font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">{tool.status === 'ready' ? 'LIVE MODULE' : 'INTEGRATION / BUILD'}</div></section><section className="nexor-panel p-6"><div className="text-[12px] font-semibold">{tool.status === 'ready' ? 'Ready' : 'Architecture ready'}</div><div className="mt-2 text-[9px] text-[var(--text-muted)]">Provider credentials are separated from UI logic.</div></section></main></DashboardLayout>;
}
