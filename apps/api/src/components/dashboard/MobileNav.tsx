'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['Home', '/dashboard', '⌂'],
  ['Leads', '/dashboard/tools/lead-finder', '◎'],
  ['Inbox', '/dashboard/tools/whatsapp-inbox', '□'],
  ['CRM', '/dashboard/tools/crm-pipeline', '◫'],
  ['AI', '/dashboard/tools/ai-command-center', '✦'],
] as const;

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map(([label, href, icon]) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={label}
              href={href}
              className={[
                'flex min-h-12 flex-col items-center justify-center rounded-xl text-[9px] font-medium transition',
                active
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
              ].join(' ')}
            >
              <span className="text-sm leading-none">{icon}</span>
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
