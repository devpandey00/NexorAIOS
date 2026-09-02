/**
 * Data contracts for the NEXOR Executive Dashboard — adapted to the real
 * NexorAIOS schema (packages/database/prisma/schema.prisma), not the
 * generic demo shape from the original design package.
 *
 * Notable adaptations, and why:
 *  - No `spend`/`cpl`/`roas` fields anywhere: Campaign/Outreach have no
 *    ad-spend columns in this schema. Campaign health uses lead counts
 *    instead of fabricating cost metrics.
 *  - Pipeline is a snapshot, not a trend: Opportunity has no historical
 *    snapshots, so "pipeline over time" isn't real data. Revenue over
 *    time IS real (Opportunity.wonAt), so the chart shows that; total
 *    open pipeline value is a point-in-time KPI instead.
 *  - `aiRecommendations` here are rule-based, derived from real
 *    aggregates (see route.ts) — not an LLM call. See the TODO in
 *    route.ts for where to wire packages/ai's orchestrator for genuine
 *    AI-generated recommendations.
 */

export type TrendDirection = 'up' | 'down' | 'flat';

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  format: 'number' | 'currency' | 'percent';
  deltaPercent?: number;
  trend?: TrendDirection;
  sparkline?: number[];
}

export interface RevenuePoint {
  date: string; // ISO date (day granularity)
  revenue: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export type AttentionSeverity = 'critical' | 'warning' | 'info';

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  severity: AttentionSeverity;
  entityType: 'lead' | 'campaign' | 'system' | 'pipeline';
}

export interface RecommendedAction {
  id: string;
  title: string;
  rationale: string;
  affectedRecordCount: number;
  affectedEntityType: 'lead' | 'campaign' | 'pipeline';
  suggestedAction: string;
}

export type PipelineStageId = 'OPEN' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';

export interface PipelineStageSnapshot {
  stage: PipelineStageId;
  label: string;
  count: number;
  value: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
}

export type ActivityEventKind = 'ai' | 'system' | 'user';

export interface ActivityItem {
  id: string;
  kind: ActivityEventKind;
  message: string;
  timestamp: string;
}

export interface DashboardData {
  kpis: KpiMetric[];
  revenueSeries: RevenuePoint[];
  pipelineValueTotal: number;
  funnel: FunnelStage[];
  attentionItems: AttentionItem[];
  recommendedActions: RecommendedAction[];
  pipelineSnapshot: PipelineStageSnapshot[];
  campaigns: CampaignSummary[];
  activity: ActivityItem[];
  generatedAt: string;
}

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: T };
