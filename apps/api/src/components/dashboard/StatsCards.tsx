import { ArrowUpRight, Briefcase, DollarSign, MessageSquare, Target } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

const stats = [
  {
    title: "Today's Leads",
    value: '1,248',
    change: '+18%',
    icon: Target,
    color: 'text-blue-400',
  },
  {
    title: 'Qualified',
    value: '84',
    change: '+12%',
    icon: Briefcase,
    color: 'text-green-400',
  },
  {
    title: 'Conversations',
    value: '17',
    change: '+6%',
    icon: MessageSquare,
    color: 'text-yellow-400',
  },
  {
    title: 'Pipeline',
    value: '₹2.4L',
    change: '+31%',
    icon: DollarSign,
    color: 'text-emerald-400',
  },
];

export default function StatsCards() {
  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => {
        const Icon = item.icon;

        return (
          <Card
            key={item.title}
            className="group border-zinc-800 bg-zinc-900/70 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/40 hover:shadow-2xl hover:shadow-yellow-500/10"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`rounded-2xl border border-zinc-700 p-3 ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400">
                  <ArrowUpRight className="h-3 w-3" />
                  {item.change}
                </div>
              </div>

              <div className="mt-8">
                <p className="text-sm text-zinc-400">{item.title}</p>

                <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">{item.value}</h2>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
