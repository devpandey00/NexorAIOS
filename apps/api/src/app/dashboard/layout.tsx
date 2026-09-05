import type { ReactNode } from 'react';

// Dashboard pages read live CRM/automation data at request time. Keeping the
// dashboard route segment dynamic prevents Next.js from querying production
// PostgreSQL while generating static pages during the Vercel build.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  return children;
}
