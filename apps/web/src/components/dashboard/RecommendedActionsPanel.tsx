import { Panel, PanelHeader } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import type { RecommendedAction } from '@/lib/types';

/**
 * These are rule-based signals derived from real aggregates in
 * route.ts (e.g. "N qualified leads with no outreach yet") — not an
 * LLM call. See the TODO(ai) comment in route.ts for wiring a real
 * call into packages/ai for genuine AI-generated recommendations.
 */
export function RecommendedActionsPanel({ actions }: { actions: RecommendedAction[] }) {
  return (
    <Panel accent="gold">
      <PanelHeader title="Recommended Actions" eyebrow="Next Best Action" />
      {actions.length === 0 ? (
        <div className="p-5">
          <EmptyState title="No open recommendations" description="Rule-based next-best-action signals will appear here as leads, follow-ups, and campaigns need attention." />
        </div>
      ) : (
        <ul className="flex flex-col gap-px bg-nx-border">
          {actions.map((rec) => (
            <li key={rec.id} className="bg-nx-surface">
              <div className="flex flex-col gap-1.5 px-5 py-4">
                <span className="text-[13px] font-medium text-nx-text-primary">{rec.title}</span>
                <span className="text-[12px] italic leading-relaxed text-nx-gold/90">{rec.rationale}</span>
                <div className="mt-1 flex items-center justify-between text-[11px] text-nx-text-muted">
                  <span>
                    {rec.affectedRecordCount} {rec.affectedEntityType}
                    {rec.affectedRecordCount === 1 ? '' : 's'} affected
                  </span>
                  <span>{rec.suggestedAction}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
