'use client';

import type { KpiMetric } from '@/lib/types';
import { formatKpiValue, formatDelta } from '@/lib/format';
import { Sparkline } from '@/components/ui/Sparkline';
import { Skeleton } from '@/components/ui/States';
import { cn } from '@/lib/cn';

export function KpiRibbon({ kpis }: { kpis: KpiMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-nx-panel border border-nx-border bg-nx-border sm:grid-cols-3 lg:grid-cols-7">
      {kpis.map((kpi) => {
        const delta = formatDelta(kpi.deltaPercent);
        const trendColor = kpi.trend === 'up' ? 'text-nx-success' : kpi.trend === 'down' ? 'text-nx-danger' : 'text-nx-text-muted';
        return (
          <div key={kpi.id} className="flex flex-col gap-2 bg-nx-surface px-4 py-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-nx-text-muted">{kpi.label}</span>
            <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-nx-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatKpiValue(kpi)}
            </span>
            <div className="flex items-center justify-between">
              {delta ? <span className={cn('text-[12px] font-medium', trendColor)}>{delta}</span> : <span />}
              {kpi.sparkline && <Sparkline data={kpi.sparkline} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KpiRibbonSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-nx-panel border border-nx-border bg-nx-border sm:grid-cols-3 lg:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 bg-nx-surface px-4 py-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
