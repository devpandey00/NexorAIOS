import { ArrowRight, Globe, Sparkles, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const leads = [
  {
    company: 'Apple Interiors',
    country: 'California, USA',
    score: 96,
    recommendation: 'Website + Google Ads',
  },
  {
    company: 'Urban Kitchen',
    country: 'Miami, USA',
    score: 91,
    recommendation: 'SEO + Local SEO',
  },
  {
    company: 'Elite Homes',
    country: 'Texas, USA',
    score: 94,
    recommendation: 'Website Redesign',
  },
];

export default function LeadIntelligence() {
  return (
    <section className="mt-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Lead Intelligence</h2>

          <p className="mt-1 text-zinc-400">AI ranked today's highest opportunity businesses.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {leads.map((lead) => (
          <Card
            key={lead.company}
            className="group border-zinc-800 bg-zinc-900 transition-all duration-300 hover:-translate-y-2 hover:border-yellow-500/40"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 text-lg font-bold text-black">
                    {lead.company.charAt(0)}
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">{lead.company}</h3>

                    <div className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                      <Globe className="h-4 w-4" />

                      {lead.country}
                    </div>
                  </div>
                </div>

                <Badge className="bg-green-500 text-black">{lead.score}/100</Badge>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />

                  <span className="font-medium text-white">AI Recommendation</span>
                </div>

                <p className="mt-3 text-zinc-400">
                  Sell:
                  <span className="ml-2 font-medium text-white">{lead.recommendation}</span>
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />

                  <span className="text-sm text-yellow-400">High Opportunity</span>
                </div>

                <Button>
                  Open
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
