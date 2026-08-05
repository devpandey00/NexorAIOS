import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsCards from '@/components/dashboard/StatsCards';
import AIEmployees from '@/components/dashboard/AIEmployees';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import LeadIntelligence from '@/components/dashboard/LeadIntelligence';

export default async function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero */}
        <DashboardHeader />

        {/* Statistics */}
        <StatsCards />

        {/* AI Employees */}
        <AIEmployees />

        {/* Main Content */}
        <div className="grid gap-8 xl:grid-cols-3">
          {/* Left */}
          <div className="xl:col-span-2">
            <LeadIntelligence />
          </div>

          {/* Right */}
          <div>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
