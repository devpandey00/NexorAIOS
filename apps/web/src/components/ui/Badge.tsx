import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'gold';

const toneClasses: Record<BadgeTone, string> = {
  critical: 'bg-nx-danger/15 text-nx-danger border-nx-danger/30',
  warning: 'bg-nx-warning/15 text-nx-warning border-nx-warning/30',
  info: 'bg-nx-info/15 text-nx-info border-nx-info/30',
  success: 'bg-nx-success/15 text-nx-success border-nx-success/30',
  neutral: 'bg-nx-surface-elevated text-nx-text-secondary border-nx-border',
  gold: 'bg-nx-gold/15 text-nx-gold border-nx-gold/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-nx-chip border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]', toneClasses[tone])}>
      {children}
    </span>
  );
}
