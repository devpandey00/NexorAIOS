import { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface AgentCardProps {
  title: string;
  description: string;
  progress: number;
  status: string;
  value: string;
  color: string;
  icon: LucideIcon;
}

export default function AgentCard({
  title,
  description,
  progress,
  status,
  value,
  color,
  icon: Icon,
}: AgentCardProps) {
  return (
    <Card className="border-zinc-800 bg-zinc-900 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/30">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className={`rounded-2xl p-3 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />

            <span className="text-xs text-green-400">{status}</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-white">{title}</h3>

        <p className="mt-2 text-sm text-zinc-400">{description}</p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-500">Progress</span>

            <span className="text-white">{value}</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${color}`}
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
