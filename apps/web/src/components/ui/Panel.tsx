import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  accent?: 'none' | 'gold' | 'teal';
  children: ReactNode;
}

export function Panel({ accent = 'none', className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-nx-panel border border-nx-border bg-nx-surface',
        accent === 'gold' && 'border-l-2 border-l-nx-gold',
        accent === 'teal' && 'border-l-2 border-l-nx-teal',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-nx-border px-5 py-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-nx-text-muted">{eyebrow}</p>
        )}
        <h3 className="text-[15px] font-medium leading-tight text-nx-text-primary">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
