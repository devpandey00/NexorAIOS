import DashboardLayout from '@/components/dashboard/DashboardLayout';
import GrowthCommandCenter from '@/components/dashboard/GrowthCommandCenter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function GrowthCommandCenterPage() {
  return <DashboardLayout><main className="mx-auto max-w-[1500px]"><GrowthCommandCenter /></main></DashboardLayout>;
}
