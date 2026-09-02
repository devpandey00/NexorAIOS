import type { AsyncState, DashboardData } from './types';

/**
 * Calls the real /api/dashboard route, which queries the live NexorAIOS
 * database (see app/api/dashboard/route.ts). No sample/preview data lives
 * in this file — if the database has no rows yet, the API returns real
 * zeros and empty arrays, and the UI's own empty states handle that.
 */
export async function fetchDashboardData(): Promise<AsyncState<DashboardData>> {
  try {
    const response = await fetch('/api/dashboard', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok || !result.ok) {
      return { status: 'error', error: result.error ?? 'Unable to load dashboard data' };
    }
    return { status: 'success', data: result.data as DashboardData };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err.message : 'Unable to reach the dashboard API' };
  }
}

export function isStale(generatedAt: string, staleAfterMinutes = 30): boolean {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  return ageMs > staleAfterMinutes * 60 * 1000;
}
