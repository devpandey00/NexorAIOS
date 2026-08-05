import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function CommandCenter() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white">AI Command Center</h1>

          <p className="mt-2 text-zinc-400">Monitor every AI employee working inside Nexor OS.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
