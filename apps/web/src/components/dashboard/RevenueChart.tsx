'use client';

import { useMemo, useState } from 'react';
import type { RevenuePoint } from '@/lib/types';
import { formatCompactCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

const RANGES = [
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
] as const;

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = 24;

/**
 * Real revenue-over-time chart from Opportunity.wonAt (see route.ts).
 * There is no historical pipeline-value data in this schema (Opportunity
 * has no snapshot history), so unlike the original demo package, this
 * does NOT chart a "pipeline" trend line — that would have to be
 * fabricated. Total open pipeline value is shown as a KPI instead.
 */
export function RevenueChart({ series }: { series: RevenuePoint[] }) {
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('30d');
  const range = RANGES.find((r) => r.id === rangeId)!;
  const visible = useMemo(() => series.slice(-range.days), [series, range.days]);

  const { path, areaPath, max, points } = useMemo(() => buildChart(visible), [visible]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const hasAnyRevenue = visible.some((p) => p.revenue > 0);

  return (
    <div className="rounded-nx-panel border border-nx-border bg-nx-surface">
      <div className="flex items-start justify-between gap-3 border-b border-nx-border px-5 py-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-nx-text-muted">Main Intelligence</p>
          <h3 className="text-[15px] font-medium leading-tight text-nx-text-primary">Revenue</h3>
        </div>
        <div className="flex items-center gap-1 rounded-nx-control border border-nx-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRangeId(r.id)}
              className={cn(
                'rounded-nx-chip px-2 py-1 text-[11px] font-semibold transition-colors duration-150',
                r.id === rangeId ? 'bg-nx-surface-elevated text-nx-text-primary' : 'text-nx-text-muted hover:text-nx-text-secondary',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {!hasAnyRevenue ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <div className="h-8 w-8 rounded-full border border-dashed border-nx-border" aria-hidden="true" />
            <p className="text-[15px] font-medium text-nx-text-primary">No revenue in this range yet</p>
            <p className="max-w-xs text-[13px] leading-relaxed text-nx-text-muted">
              Revenue is calculated from won opportunities. It will appear here as deals close.
            </p>
          </div>
        ) : (
          <div className="relative w-full">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Revenue over time">
              <defs>
                <linearGradient id="nx-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--nx-teal)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--nx-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={PADDING}
                  x2={WIDTH - PADDING}
                  y1={PADDING + f * (HEIGHT - PADDING * 2)}
                  y2={PADDING + f * (HEIGHT - PADDING * 2)}
                  stroke="var(--nx-border)"
                  strokeWidth={1}
                />
              ))}
              <path d={areaPath} fill="url(#nx-revenue-fill)" />
              <path d={path} fill="none" stroke="var(--nx-teal)" strokeWidth={2} />
              {points.map((p, i) => (
                <rect
                  key={i}
                  x={p.x - (WIDTH / points.length) / 2}
                  y={0}
                  width={WIDTH / points.length}
                  height={HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                />
              ))}
              {hoverIdx !== null && (
                <>
                  <line x1={points[hoverIdx].x} x2={points[hoverIdx].x} y1={PADDING} y2={HEIGHT - PADDING} stroke="var(--nx-border-strong, var(--nx-border))" strokeDasharray="2 2" />
                  <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r={3.5} fill="var(--nx-teal)" />
                </>
              )}
            </svg>
            <div className="mt-2 flex items-center justify-between text-[11px] text-nx-text-muted">
              <span>{visible[0]?.date}</span>
              <span>{formatCompactCurrency(max)} peak/day</span>
              <span>{visible[visible.length - 1]?.date}</span>
            </div>
            {hoverIdx !== null && (
              <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-nx-control border border-nx-border bg-nx-surface-elevated px-2.5 py-1.5 text-[12px] text-nx-text-primary shadow-none">
                {visible[hoverIdx].date} — {formatCompactCurrency(visible[hoverIdx].revenue)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function buildChart(series: RevenuePoint[]) {
  const max = Math.max(...series.map((p) => p.revenue), 1);
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;
  const points = series.map((p, i) => {
    const x = PADDING + (i / Math.max(series.length - 1, 1)) * innerWidth;
    const y = PADDING + innerHeight - (p.revenue / max) * innerHeight;
    return { x, y };
  });
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${points[points.length - 1]?.x.toFixed(1)},${HEIGHT - PADDING} L${points[0]?.x.toFixed(1)},${HEIGHT - PADDING} Z`;
  return { path, areaPath, max, points };
}
