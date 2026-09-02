import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-nx-control bg-nx-surface-elevated', className)} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="h-8 w-8 rounded-full border border-dashed border-nx-border" aria-hidden="true" />
      <p className="text-[15px] font-medium text-nx-text-primary">{title}</p>
      <p className="max-w-xs text-[13px] leading-relaxed text-nx-text-muted">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="h-8 w-8 rounded-full border border-nx-danger/40 bg-nx-danger/10" aria-hidden="true" />
      <p className="text-[15px] font-medium text-nx-text-primary">{title}</p>
      <p className="max-w-xs text-[13px] leading-relaxed text-nx-text-muted">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-nx-control border border-nx-border px-3 py-1.5 text-[13px] font-medium text-nx-text-primary transition-colors duration-150 hover:bg-nx-surface-hover">
          Retry
        </button>
      )}
    </div>
  );
}

export function StaleDataBanner({ generatedAtLabel }: { generatedAtLabel: string }) {
  return (
    <div className="flex items-center gap-2 rounded-nx-control border border-nx-border bg-nx-surface-elevated px-3 py-2 text-[13px] text-nx-text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-nx-text-muted" aria-hidden="true" />
      Data last refreshed {generatedAtLabel}.
    </div>
  );
}
