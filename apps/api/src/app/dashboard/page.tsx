import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import AIEmployees from '@/components/dashboard/AIEmployees';
import LeadIntelligence from '@/components/dashboard/LeadIntelligence';

export default async function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardHeader />

      <div className="mt-8">
        <StatsCards />
      </div>

      <div className="mt-8">
        <AIEmployees />
      </div>

      <div className="mt-10">
        <LeadIntelligence />
      </div>
    </DashboardLayout>
  );
}
