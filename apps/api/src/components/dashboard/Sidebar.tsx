'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BrainCircuit,
  Target,
  Search,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'AI Command',
    href: '/dashboard/command',
    icon: BrainCircuit,
  },
  {
    title: 'Lead Intelligence',
    href: '/dashboard/leads',
    icon: Target,
  },
  {
    title: 'Research',
    href: '/dashboard/research',
    icon: Search,
  },
  {
    title: 'Outreach',
    href: '/dashboard/outreach',
    icon: MessageSquare,
  },
  {
    title: 'Clients',
    href: '/dashboard/clients',
    icon: Users,
  },
  {
    title: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen border-r bg-zinc-950 transition-all duration-300',
        collapsed ? 'w-20' : 'w-72',
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-5 py-5">
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold text-white">NEXOR</h2>

              <p className="text-xs text-zinc-400">AI Operating System</p>
            </div>
          )}

          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft
              className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')}
            />
          </Button>
        </div>

        <nav className="flex-1 space-y-2 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active = pathname === item.href;

            return (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all',
                  active
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
                )}
              >
                <Icon size={20} />

                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t p-4">
            <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-4">
              <p className="text-sm font-semibold text-white">AI Status</p>

              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />

                <span className="text-xs text-zinc-300">All Agents Running</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
