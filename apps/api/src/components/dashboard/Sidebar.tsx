'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const groups = [
  { title: 'COMMAND', items: [['Overview','/dashboard','⌂'],['AIOS Command Center','/dashboard/aios','✦'],['Autopilot','/dashboard/command','◈']] },
  { title: 'ACQUISITION', items: [['Lead Generation','/dashboard/tools/lead-finder','◎'],['Leads','/dashboard/tools/lead-inbox','◉'],['Research','/dashboard/tools/seo-audit','⌕'],['Campaigns','/dashboard/command','◌'],['Opportunities','/dashboard/tools/opportunities','◇']] },
  { title: 'SALES', items: [['Outreach','/dashboard/tools/whatsapp-drafts','↗'],['WhatsApp','/dashboard/tools/whatsapp-sending','◍'],['Email','/dashboard/tools/email-drafts','✉'],['Inbox','/dashboard/tools/whatsapp-inbox','□'],['CRM','/dashboard/tools/crm-pipeline','◫'],['Follow-ups','/dashboard/tools/follow-up-manager','↻'],['Proposals','/dashboard/aios#proposals','▤']] },
  { title: 'GROWTH', items: [['Social Growth','/dashboard/tools/social-growth','✦'],['Social Hub','/dashboard/tools/social-scheduler','◎'],['Content Calendar','/dashboard/tools/content-calendar','◫'],['Content Studio','/dashboard/tools/content-ideas','✎'],['Meta Ads','/dashboard/tools/meta-ads-overview','M'],['SEO','/dashboard/tools/seo-audit','⌕']] },
  { title: 'OPERATIONS', items: [['AI Agents','/dashboard/tools/ai-agents','✧'],['Automations','/dashboard/tools/automation-center','⚙'],['Automation Control','/dashboard/settings/automation','◉'],['Approvals','/dashboard/aios#approvals','✓'],['Clients','/dashboard/aios#clients','◉'],['Finance','/dashboard/aios#finance','₹'],['Reports','/dashboard/tools/google-reporting','▤']] },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
      <div className="flex h-[72px] items-center border-b border-[var(--border)] px-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--primary)] text-sm font-black text-white shadow-[0_0_28px_rgba(91,95,239,.25)]">N</div>
          <div><div className="text-[13px] font-extrabold tracking-[.22em] text-[var(--text)]">NEXOR</div><div className="mt-0.5 font-mono text-[7px] tracking-[.20em] text-[var(--text-muted)]">BUSINESS OPERATING SYSTEM</div></div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(group => (
          <div key={group.title} className="mb-5">
            <div className="mb-2 px-3 font-mono text-[7px] font-bold tracking-[.20em] text-[var(--text-muted)]">{group.title}</div>
            <div className="space-y-0.5">
              {group.items.map(([label, href, icon]) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return <Link key={`${label}-${href}`} href={href} className={['group flex h-8 items-center gap-3 rounded-[8px] px-3 text-[10px] transition-all',active?'bg-[var(--primary-soft)] text-[var(--text)] ring-1 ring-[var(--primary)]/15':'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]'].join(' ')}>
                  <span className={['w-4 text-center text-[10px]',active?'text-[var(--primary)]':'text-[var(--text-muted)]'].join(' ')}>{icon}</span><span className="flex-1 truncate">{label}</span>{active && <span className="h-1 w-1 rounded-full bg-[var(--primary)]" />}
                </Link>;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-3 flex items-center gap-2 rounded-[10px] border border-[var(--success)]/15 bg-[var(--success)]/[.035] px-3 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)]" />
          <div><div className="text-[8px] font-semibold text-[var(--text)]">Operating normally</div><div className="mt-0.5 font-mono text-[6px] text-[var(--text-muted)]">CORE · DATABASE · AGENTS</div></div>
        </div>
        <div className="flex items-center gap-3 px-2 py-2"><div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--primary)]/20 bg-[var(--primary-soft)] text-[10px] font-bold text-[var(--primary)]">D</div><div><div className="text-[9px] font-semibold text-[var(--text)]">Dev</div><div className="text-[7px] text-[var(--text-muted)]">Founder · Nexor</div></div></div>
      </div>
    </aside>
  );
}
