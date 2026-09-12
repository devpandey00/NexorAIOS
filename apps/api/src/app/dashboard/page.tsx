import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FounderCommandCenter from '@/components/dashboard/FounderCommandCenter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function Dashboard() {
  return <DashboardLayout><FounderCommandCenter /></DashboardLayout>;
}
