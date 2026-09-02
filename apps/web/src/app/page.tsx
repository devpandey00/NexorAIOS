'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardData, isStale } from '@/lib/dashboard-data';
import type { AsyncState, DashboardData } from '@/lib/types';
import { formatRelativeTime } from '@/lib/format';

import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Topbar } from '@/components/layout/Topbar';
import { KpiRibbon, KpiRibbonSkeleton } from '@/components/dashboard/KpiRibbon';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { AcquisitionFunnel } from '@/components/dashboard/AcquisitionFunnel';
import { AttentionQueue } from '@/components/dashboard/AttentionQueue';
import { RecommendedActionsPanel } from '@/components/dashboard/RecommendedActionsPanel';
import { CrmPipelineSnapshot } from '@/components/dashboard/CrmPipelineSnapshot';
import { CampaignHealthTable } from '@/components/dashboard/CampaignHealthTable';
import { LiveActivityTimeline } from '@/components/dashboard/LiveActivityTimeline';
import { ErrorState, StaleDataBanner, Skeleton } from '@/components/ui/States';

/**
 * NEXOR Executive Dashboard — real data via /api/dashboard (see
 * app/api/dashboard/route.ts), which queries the live NexorAIOS
 * database. This replaces the previous minimal metrics page but keeps
 * the same "/" route, so nothing that linked here breaks.
 */
export default function Home() {
  const [state, setState] = useState<AsyncState<DashboardData>>({ status: 'loading' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchDashboardData();
    setState(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-nx-background">
        <Topbar onRefresh={load} loading={loading} />
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-5 py-6">
          <header className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-nx-text-muted">Overview</p>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-nx-text-primary">Command Dashboard</h1>
          </header>

          {state.status === 'loading' && <DashboardSkeleton />}

          {state.status === 'error' && (
            <ErrorState description={state.error} onRetry={load} />
          )}

          {state.status === 'success' && (
            <>
              {isStale(state.data.generatedAt) && <StaleDataBanner generatedAtLabel={formatRelativeTime(state.data.generatedAt)} />}

              <KpiRibbon kpis={state.data.kpis} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <RevenueChart series={state.data.revenueSeries} />
                </div>
                <AttentionQueue items={state.data.attentionItems} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <AcquisitionFunnel stages={state.data.funnel} />
                <div className="lg:col-span-2">
                  <RecommendedActionsPanel actions={state.data.recommendedActions} />
                </div>
              </div>

              <CrmPipelineSnapshot stages={state.data.pipelineSnapshot} />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <CampaignHealthTable campaigns={state.data.campaigns} />
                </div>
                <LiveActivityTimeline events={state.data.activity} />
              </div>
            </>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <KpiRibbonSkeleton />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}
