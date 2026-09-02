import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import type { AttentionItem, AttentionSeverity } from '@/lib/types';

const severityTone: Record<AttentionSeverity, BadgeTone> = { critical: 'critical', warning: 'warning', info: 'info' };

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <Panel>
      <PanelHeader title="Needs Attention" eyebrow="Operational" action={items.length > 0 ? <Badge tone="neutral">{items.length}</Badge> : undefined} />
      {items.length === 0 ? (
        <div className="p-5">
          <EmptyState title="Nothing needs attention" description="Overdue follow-ups, tasks, and failed jobs will show up here." />
        </div>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li key={item.id} className={i > 0 ? 'border-t border-nx-border' : undefined}>
              <div className="flex flex-col gap-1.5 px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-nx-text-primary">{item.title}</span>
                  <Badge tone={severityTone[item.severity]}>{item.severity}</Badge>
                </div>
                <p className="text-[12px] leading-relaxed text-nx-text-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
