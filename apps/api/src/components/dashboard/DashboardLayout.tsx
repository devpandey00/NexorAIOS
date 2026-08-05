import type { ReactNode } from 'react';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1800px] p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
