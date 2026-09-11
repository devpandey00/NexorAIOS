import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import FounderGlobalControls from './FounderGlobalControls';
import ThemeRuntime from './ThemeRuntime';

interface DashboardLayoutProps { children: ReactNode; }
export default function DashboardLayout({ children }: DashboardLayoutProps) {
 return <div className="min-h-screen bg-[var(--bg)] pb-20 text-[var(--text)] lg:pb-0"><ThemeRuntime/><div className="flex min-h-screen"><Sidebar/><div className="flex min-w-0 flex-1 flex-col"><Topbar/><main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><FounderGlobalControls/>{children}</div></main></div></div><MobileNav/></div>;
}
