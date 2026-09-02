import { Panel, PanelHeader } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import type { ActivityItem, ActivityEventKind } from '@/lib/types';
import { formatRelativeTime } from '@/lib/format';

const kindColor: Record<ActivityEventKind, string> = { ai: 'bg-nx-gold', system: 'bg-nx-text-muted', user: 'bg-nx-info' };

export function LiveActivityTimeline({ events }: { events: ActivityItem[] }) {
  return (
    <Panel>
      <PanelHeader title="Live Activity" eyebrow="Operations" />
      {events.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No recent activity" description="System and agent activity will stream in here." />
        </div>
      ) : (
        <ol className="px-5 py-4">
          {events.map((event, i) => (
            <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < events.length - 1 && <span className="absolute left-[3px] top-3 h-full w-px bg-nx-border" aria-hidden="true" />}
              <span className={`relative z-10 mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${kindColor[event.kind]}`} aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] leading-snug text-nx-text-primary">{event.message}</span>
                <span className="text-[11px] text-nx-text-muted">{formatRelativeTime(event.timestamp)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
