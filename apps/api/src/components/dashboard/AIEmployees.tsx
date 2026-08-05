import { Brain, Search, Send, FileText } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

const agents = [
  {
    title: 'Lead Hunter',
    icon: Search,
    status: 'Searching businesses...',
    progress: 84,
    value: '842 / 1000',
    color: 'bg-blue-500',
  },
  {
    title: 'Research AI',
    icon: Brain,
    status: 'Analyzing websites...',
    progress: 62,
    value: '63 Reports',
    color: 'bg-yellow-500',
  },
  {
    title: 'Outreach AI',
    icon: Send,
    status: 'Preparing messages...',
    progress: 58,
    value: '47 / 80',
    color: 'bg-green-500',
  },
  {
    title: 'Proposal AI',
    icon: FileText,
    status: 'Generating proposals...',
    progress: 91,
    value: '12 Ready',
    color: 'bg-purple-500',
  },
];

export default function AIEmployees() {
  return (
    <section className="mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">AI Employees</h2>

        <p className="text-zinc-400">Your autonomous workforce is running in real time.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {agents.map((agent) => {
          const Icon = agent.icon;

          return (
            <Card
              key={agent.title}
              className="border-zinc-800 bg-zinc-900 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/30"
            >
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className={`rounded-2xl p-3 ${agent.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white">{agent.title}</h3>

                <p className="mt-1 text-sm text-zinc-400">{agent.status}</p>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-zinc-500">Progress</span>

                    <span className="text-white">{agent.value}</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full ${agent.color}`}
                      style={{
                        width: `${agent.progress}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
