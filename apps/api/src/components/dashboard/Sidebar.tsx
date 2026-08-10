'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const groups = [
  {
    title: 'COMMAND',
    items: [
      ['Overview', '/dashboard', '⌂'],
      ['Autopilot', '/dashboard/command', '✦'],
      ['Campaigns', '/dashboard/command', '◎'],
    ],
  },
  {
    title: 'GROWTH',
    items: [
      ['Leads', '/dashboard/leads', '◉'],
      ['Research', '/dashboard/research', '⌕'],
      ['Outreach', '/dashboard/outreach', '↗'],
      ['Inbox', '/dashboard/inbox', '□'],
      ['Follow-ups', '/dashboard/followups', '↻'],
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      ['Pipeline', '/dashboard/pipeline', '◫'],
      ['Clients', '/dashboard/clients', '♙'],
      ['Analytics', '/dashboard/analytics', '◒'],
      ['Reports', '/dashboard/reports', '▤'],
    ],
  },
  {
    title: 'AI WORKFORCE',
    items: [
      ['AI Agents', '/dashboard/agents', '✧'],
      ['Automations', '/dashboard/automations', '⚙'],
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[238px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
      <div className="flex h-[70px] items-center border-b border-[var(--border)] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
            N
          </div>

          <div>
            <div className="text-[13px] font-bold tracking-[0.24em] text-[var(--text)]">NEXOR</div>

            <div className="mt-0.5 text-[8px] tracking-[0.25em] text-[var(--text-muted)]">
              AI OPERATING SYSTEM
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="mb-2 px-3 font-mono text-[8px] font-semibold tracking-[0.22em] text-[var(--text-muted)]">
              {group.title}
            </div>

            <div className="space-y-0.5">
              {group.items.map(([label, href, icon]) => {
                const active =
                  pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

                return (
                  <Link
                    key={`${label}-${href}`}
                    href={href}
                    className={[
                      'group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] transition-all',
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-4 text-center text-[12px]',
                        active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
                      ].join(' ')}
                    >
                      {icon}
                    </span>

                    <span className="flex-1">{label}</span>

                    {label === 'Inbox' && (
                      <span className="rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--accent)]">
                        0
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.035] px-3 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />

          <div>
            <div className="text-[9px] font-medium text-[var(--text)]">All systems operational</div>

            <div className="mt-0.5 font-mono text-[7px] text-[var(--text-muted)]">
              API · DATABASE · AI
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
            D
          </div>

          <div>
            <div className="text-[10px] font-semibold text-[var(--text)]">Dev</div>

            <div className="text-[8px] text-[var(--text-muted)]">Founder · Nexor</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
