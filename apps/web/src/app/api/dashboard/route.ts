import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database/client';
import { LeadStatus, JobStatus, OpportunityStage, CampaignStatus, FollowUpStatus, TaskStatus } from '@prisma/client';
import type {
  DashboardData,
  KpiMetric,
  RevenuePoint,
  FunnelStage,
  AttentionItem,
  RecommendedAction,
  PipelineStageSnapshot,
  CampaignSummary,
  ActivityItem,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const REVENUE_DAYS = 90;
const QUALIFIED_PLUS: LeadStatus[] = [
  LeadStatus.QUALIFIED,
  LeadStatus.PITCH_READY,
  LeadStatus.CONTACTED,
  LeadStatus.REPLIED,
  LeadStatus.MEETING_BOOKED,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.WON,
];
const CONTACTED_PLUS: LeadStatus[] = [
  LeadStatus.CONTACTED,
  LeadStatus.REPLIED,
  LeadStatus.MEETING_BOOKED,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.WON,
];
const MEETING_PLUS: LeadStatus[] = [LeadStatus.MEETING_BOOKED, LeadStatus.PROPOSAL_SENT, LeadStatus.WON];
const PROPOSAL_PLUS: LeadStatus[] = [LeadStatus.PROPOSAL_SENT, LeadStatus.WON];

export async function GET() {
  try {
    const { read } = getDatabaseClients();
    const now = new Date();
    const revenueSince = new Date(now.getTime() - REVENUE_DAYS * 86400000);
    const sparklineSince = new Date(now.getTime() - 7 * 86400000);

    const [
      totalLeads,
      qualifiedLeads,
      meetingsBooked,
      wonLeads,
      activeCampaigns,
      wonOpportunities,
      openPipelineAgg,
      funnelCounts,
      overdueFollowUps,
      overdueTasks,
      recentFailedJobs,
      pipelineGroups,
      campaigns,
      recentActivity,
      recentLeadsForSparkline,
    ] = await Promise.all([
      read.lead.count(),
      read.lead.count({ where: { status: { in: QUALIFIED_PLUS } } }),
      read.meeting.count(),
      read.lead.count({ where: { status: LeadStatus.WON } }),
      read.campaign.count({ where: { status: CampaignStatus.RUNNING } }),
      read.opportunity.findMany({
        where: { stage: OpportunityStage.WON, wonAt: { gte: revenueSince } },
        select: { value: true, wonAt: true },
      }),
      read.opportunity.aggregate({
        where: { stage: { in: [OpportunityStage.OPEN, OpportunityStage.QUALIFIED, OpportunityStage.PROPOSAL] } },
        _sum: { value: true },
      }),
      Promise.all([
        read.lead.count(),
        read.lead.count({ where: { status: { in: QUALIFIED_PLUS } } }),
        read.lead.count({ where: { status: { in: CONTACTED_PLUS } } }),
        read.lead.count({ where: { status: { in: MEETING_PLUS } } }),
        read.lead.count({ where: { status: { in: PROPOSAL_PLUS } } }),
        read.lead.count({ where: { status: LeadStatus.WON } }),
      ]),
      read.followUp.findMany({
        where: { status: FollowUpStatus.PENDING, scheduledAt: { lt: now } },
        select: { id: true, scheduledAt: true, leadId: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      read.task.findMany({
        where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] }, dueAt: { lt: now } },
        select: { id: true, title: true, dueAt: true },
        orderBy: { dueAt: 'asc' },
        take: 5,
      }),
      read.job.findMany({
        where: { status: JobStatus.FAILED, createdAt: { gte: new Date(now.getTime() - 24 * 3600000) } },
        select: { id: true, type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      read.opportunity.groupBy({
        by: ['stage'],
        _count: { _all: true },
        _sum: { value: true },
      }),
      read.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, name: true, status: true, totalLeads: true, successfulLeads: true, failedLeads: true },
      }),
      read.activityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, message: true, createdAt: true },
      }),
      read.lead.findMany({
        where: { createdAt: { gte: sparklineSince } },
        select: { createdAt: true },
      }),
    ]);

    // --- KPIs -----------------------------------------------------------
    const revenueWon90d = wonOpportunities.reduce((sum, o) => sum + Number(o.value ?? 0), 0);
    const kpis: KpiMetric[] = [
      { id: 'total-leads', label: 'Total Leads', value: totalLeads, format: 'number', sparkline: sparklineFromDates(recentLeadsForSparkline.map((l) => l.createdAt)) },
      { id: 'qualified-leads', label: 'Qualified Leads', value: qualifiedLeads, format: 'number' },
      { id: 'meetings', label: 'Meetings', value: meetingsBooked, format: 'number' },
      { id: 'won', label: 'Won', value: wonLeads, format: 'number' },
      { id: 'revenue-90d', label: 'Revenue (90d)', value: revenueWon90d, format: 'currency' },
      { id: 'pipeline-value', label: 'Open Pipeline', value: Number(openPipelineAgg._sum.value ?? 0), format: 'currency' },
      { id: 'active-campaigns', label: 'Active Campaigns', value: activeCampaigns, format: 'number' },
    ];

    // --- Revenue series (real, from Opportunity.wonAt) -------------------
    const revenueByDay = new Map<string, number>();
    for (const o of wonOpportunities) {
      if (!o.wonAt) continue;
      const day = o.wonAt.toISOString().slice(0, 10);
      revenueByDay.set(day, (revenueByDay.get(day) ?? 0) + Number(o.value ?? 0));
    }
    const revenueSeries: RevenuePoint[] = Array.from({ length: REVENUE_DAYS }, (_, i) => {
      const d = new Date(revenueSince.getTime() + i * 86400000);
      const key = d.toISOString().slice(0, 10);
      return { date: key, revenue: revenueByDay.get(key) ?? 0 };
    });

    // --- Funnel -----------------------------------------------------------
    const [fTotal, fQualified, fContacted, fMeeting, fProposal, fWon] = funnelCounts;
    const funnel: FunnelStage[] = [
      { stage: 'Leads', count: fTotal },
      { stage: 'Qualified', count: fQualified },
      { stage: 'Contacted', count: fContacted },
      { stage: 'Meeting', count: fMeeting },
      { stage: 'Proposal', count: fProposal },
      { stage: 'Won', count: fWon },
    ];

    // --- Attention queue (real overdue items, no fabricated anomalies) ---
    const attentionItems: AttentionItem[] = [
      ...overdueFollowUps.map((f): AttentionItem => {
        const hoursOverdue = (now.getTime() - f.scheduledAt.getTime()) / 3600000;
        return {
          id: `followup-${f.id}`,
          title: 'Overdue follow-up',
          description: `Follow-up was due ${Math.round(hoursOverdue)}h ago.`,
          severity: hoursOverdue > 48 ? 'critical' : 'warning',
          entityType: 'lead',
        };
      }),
      ...overdueTasks.map((t): AttentionItem => ({
        id: `task-${t.id}`,
        title: `Overdue task: ${t.title}`,
        description: `Was due ${t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'previously'}.`,
        severity: 'warning',
        entityType: 'pipeline',
      })),
      ...recentFailedJobs.map((j): AttentionItem => ({
        id: `job-${j.id}`,
        title: `${j.type} job failed`,
        description: `Failed within the last 24 hours.`,
        severity: 'critical',
        entityType: 'system',
      })),
    ].slice(0, 8);

    // --- Recommended actions: RULE-BASED, not LLM-generated --------------
    // TODO(ai): replace/augment with a real call into packages/ai's
    // orchestrator or business-intelligence agent for genuine AI-generated
    // recommendations. This block only derives simple, honest signals from
    // the aggregates already computed above — it does not call any model.
    const recommendedActions: RecommendedAction[] = [];
    const staleQualified = fQualified - fContacted;
    if (staleQualified > 0) {
      recommendedActions.push({
        id: 'rec-stale-qualified',
        title: `${staleQualified} qualified lead${staleQualified === 1 ? '' : 's'} not yet contacted`,
        rationale: 'These leads passed qualification but have no outreach recorded yet.',
        affectedRecordCount: staleQualified,
        affectedEntityType: 'lead',
        suggestedAction: 'Queue for outreach',
      });
    }
    if (overdueFollowUps.length > 0) {
      recommendedActions.push({
        id: 'rec-overdue-followups',
        title: `Clear ${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length === 1 ? '' : 's'}`,
        rationale: 'Follow-ups past their scheduled date risk losing lead momentum.',
        affectedRecordCount: overdueFollowUps.length,
        affectedEntityType: 'lead',
        suggestedAction: 'Reschedule or complete',
      });
    }
    const stalledCampaigns = campaigns.filter((c) => c.status === CampaignStatus.RUNNING && c.totalLeads > 0 && c.successfulLeads === 0);
    if (stalledCampaigns.length > 0) {
      recommendedActions.push({
        id: 'rec-stalled-campaigns',
        title: `${stalledCampaigns.length} running campaign${stalledCampaigns.length === 1 ? '' : 's'} with zero successful leads`,
        rationale: 'These campaigns have processed leads but produced no successful outcomes so far.',
        affectedRecordCount: stalledCampaigns.length,
        affectedEntityType: 'campaign',
        suggestedAction: 'Review targeting or pause',
      });
    }

    // --- Pipeline snapshot (real, from Opportunity groupBy) --------------
    const stageOrder: OpportunityStage[] = [
      OpportunityStage.OPEN,
      OpportunityStage.QUALIFIED,
      OpportunityStage.PROPOSAL,
      OpportunityStage.WON,
      OpportunityStage.LOST,
    ];
    const stageLabels: Record<OpportunityStage, string> = { OPEN: 'Open', QUALIFIED: 'Qualified', PROPOSAL: 'Proposal', WON: 'Won', LOST: 'Lost' };
    const pipelineSnapshot: PipelineStageSnapshot[] = stageOrder.map((stage) => {
      const row = pipelineGroups.find((g) => g.stage === stage);
      return {
        stage: stage as unknown as PipelineStageSnapshot['stage'],
        label: stageLabels[stage],
        count: row?._count._all ?? 0,
        value: Number(row?._sum.value ?? 0),
      };
    });

    // --- Campaigns (real fields only — no spend/CPL/ROAS in this schema) -
    const campaignSummaries: CampaignSummary[] = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      totalLeads: c.totalLeads,
      successfulLeads: c.successfulLeads,
      failedLeads: c.failedLeads,
    }));

    // --- Activity (real ActivityEvent rows) -------------------------------
    const activity: ActivityItem[] = recentActivity.map((e) => ({
      id: e.id,
      kind: e.type.toLowerCase().includes('agent') || e.type.toLowerCase().includes('ai') ? 'ai' : e.type.toLowerCase().includes('user') ? 'user' : 'system',
      message: e.message,
      timestamp: e.createdAt.toISOString(),
    }));

    const data: DashboardData = {
      kpis,
      revenueSeries,
      pipelineValueTotal: Number(openPipelineAgg._sum.value ?? 0),
      funnel,
      attentionItems,
      recommendedActions,
      pipelineSnapshot,
      campaigns: campaignSummaries,
      activity,
      generatedAt: now.toISOString(),
    };

    return NextResponse.json({ ok: true, data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[dashboard] failed to load metrics', error);
    return NextResponse.json({ ok: false, error: 'Dashboard data is unavailable' }, { status: 503 });
  }
}

function sparklineFromDates(dates: Date[]): number[] | undefined {
  if (dates.length === 0) return undefined;
  const buckets = new Array(7).fill(0);
  const now = Date.now();
  for (const d of dates) {
    const daysAgo = Math.floor((now - d.getTime()) / 86400000);
    const idx = 6 - Math.min(daysAgo, 6);
    if (idx >= 0 && idx < 7) buckets[idx] += 1;
  }
  return buckets;
}
