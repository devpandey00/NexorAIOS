import { Panel, PanelHeader, PanelBody } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import type { PipelineStageSnapshot } from '@/lib/types';
import { formatCompactCurrency } from '@/lib/format';

export function CrmPipelineSnapshot({ stages }: { stages: PipelineStageSnapshot[] }) {
  const hasAny = stages.some((s) => s.count > 0);
  return (
    <Panel>
      <PanelHeader title="Sales Pipeline" eyebrow="CRM · Opportunities" />
      {!hasAny ? (
        <PanelBody>
          <EmptyState title="Pipeline is empty" description="Opportunities will appear here as deals are created." />
        </PanelBody>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-nx-border sm:grid-cols-3 lg:grid-cols-5">
          {stages.map((stage) => (
            <div key={stage.stage} className="flex flex-col gap-1 bg-nx-surface px-4 py-3.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-nx-text-muted">{stage.label}</span>
              <span className="text-[20px] font-medium text-nx-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {stage.count}
              </span>
              {stage.value > 0 && <span className="text-[12px] text-nx-text-secondary">{formatCompactCurrency(stage.value)}</span>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
