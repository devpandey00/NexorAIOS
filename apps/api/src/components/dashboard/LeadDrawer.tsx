'use client';

import { X, Globe, Sparkles, Building2, Mail, Phone, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeadDrawer({ open, onOpenChange }: LeadDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-zinc-800 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl">Apple Interiors</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div>
              <p className="text-zinc-400">AI Opportunity Score</p>

              <h2 className="mt-2 text-5xl font-bold text-yellow-400">96</h2>
            </div>

            <Sparkles className="h-12 w-12 text-yellow-400" />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <h3 className="font-semibold">AI Summary</h3>

            <p className="mt-3 leading-7 text-zinc-400">
              Website is outdated. Google Ads not running. SEO is weak. Strong opportunity for
              Website, Google Ads and Local SEO.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company
              </div>

              <p className="mt-2 text-zinc-400">Apple Interiors</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website
              </div>

              <p className="mt-2 text-zinc-400">appleinteriors.com</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email
              </div>

              <p className="mt-2 text-zinc-400">hello@apple.com</p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Phone
              </div>

              <p className="mt-2 text-zinc-400">+1 222 333 4444</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400">
              Generate Pitch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button variant="outline" className="flex-1">
              Run Research
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
