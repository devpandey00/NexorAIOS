import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Hero() {
  return (
    <Card className="overflow-hidden border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <CardContent className="relative p-10">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-400">
            <Sparkles className="h-4 w-4" />
            AI Powered Agency Operating System
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Good Evening, Dev 👋
          </h1>

          <p className="mt-6 text-lg leading-8 text-zinc-400">
            Your AI employees have been working while you were away. Review today's opportunities,
            approve outreach and close deals.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Button size="lg" className="rounded-xl bg-yellow-500 text-black hover:bg-yellow-400">
              Open AI Command Center
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button size="lg" variant="outline" className="rounded-xl border-zinc-700">
              View Today's Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
