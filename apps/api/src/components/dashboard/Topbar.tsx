'use client';

import { Bell, Command, MoonStar, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-50 h-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-8">
        {/* Left */}
        <div>
          <p className="text-sm text-zinc-400">Welcome back 👋</p>

          <h1 className="text-3xl font-bold text-white">Nexor Sales OS</h1>
        </div>

        {/* Search */}
        <div className="relative hidden w-[500px] xl:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />

          <Input
            placeholder="Search anything..."
            className="h-12 rounded-2xl border-zinc-800 bg-zinc-900 pl-11"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-400">
            ⌘ K
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Button className="rounded-xl bg-yellow-500 text-black hover:bg-yellow-400">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Command
          </Button>

          <Button variant="ghost" size="icon">
            <Bell />
          </Button>

          <Button variant="ghost" size="icon">
            <MoonStar />
          </Button>

          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-black">
              D
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Dev</p>

              <p className="text-xs text-zinc-500">Founder</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
