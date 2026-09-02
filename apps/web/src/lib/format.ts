import type { KpiMetric } from './types';

export function formatKpiValue(kpi: Pick<KpiMetric, 'value' | 'format'>): string {
  switch (kpi.format) {
    case 'currency':
      return formatCompactCurrency(kpi.value);
    case 'percent':
      return `${kpi.value.toFixed(1)}%`;
    default:
      return new Intl.NumberFormat('en-US').format(kpi.value);
  }
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatDelta(deltaPercent?: number): string | null {
  if (deltaPercent === undefined) return null;
  const sign = deltaPercent > 0 ? '+' : '';
  return `${sign}${deltaPercent.toFixed(1)}%`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
