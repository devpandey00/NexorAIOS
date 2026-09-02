import { Panel, PanelHeader, PanelBody } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import type { FunnelStage } from '@/lib/types';

export function AcquisitionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count || 1;
  return (
    <Panel>
      <PanelHeader title="Conversion Funnel" eyebrow="Lead Lifecycle" />
      <PanelBody>
        {stages.every((s) => s.count === 0) ? (
          <EmptyState title="No leads yet" description="Funnel stages will populate once leads exist in the CRM." />
        ) : (
          <ul className="flex flex-col gap-2">
            {stages.map((stage) => {
              const pct = Math.max((stage.count / max) * 100, 2);
              return (
                <li key={stage.stage} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-[12px] font-medium text-nx-text-secondary">{stage.stage}</span>
                  <span className="relative h-6 flex-1 overflow-hidden rounded-nx-chip bg-nx-surface-elevated">
                    <span className="absolute inset-y-0 left-0 rounded-nx-chip bg-nx-teal/70" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-12 shrink-0 text-right text-[13px] font-medium text-nx-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {stage.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
