'use client';

import dynamic from 'next/dynamic';

const GrowthAutomationWorkspace = dynamic(
  () => import('./GrowthAutomationWorkspace'),
  {
    ssr: false,
    loading: () => (
      <section className="nexor-panel p-6 text-[9px] text-[var(--text-muted)]">
        Loading automation workspace…
      </section>
    ),
  },
);

export default function GrowthAutomationClient(props: React.ComponentProps<typeof GrowthAutomationWorkspace>) {
  return <GrowthAutomationWorkspace {...props} />;
}
