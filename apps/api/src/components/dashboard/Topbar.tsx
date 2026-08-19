'use client';

import { useEffect, useState } from 'react';
import VoiceAssistant from './VoiceAssistant';

export default function Topbar() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('nexor-theme');

    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
      setDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  function toggleTheme() {
    const next = !dark;

    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('nexor-theme', next ? 'dark' : 'light');

    setDark(next);
  }

  return (
    <header className="sticky top-0 z-50 flex h-[70px] items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 backdrop-blur-xl lg:px-7">
      <div className="flex items-center gap-3">
        <div className="hidden h-9 w-[330px] items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 md:flex">
          <span className="text-[var(--text-muted)]">⌕</span>

          <span className="flex-1 text-[10px] text-[var(--text-muted)]">
            Search leads, campaigns, agents...
          </span>

          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--text-muted)]">
            ⌘ K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <VoiceAssistant compact />

        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/[0.04] px-3 py-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          <span className="font-mono text-[8px] tracking-[0.12em] text-emerald-500">
            SYSTEM ONLINE
          </span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-base text-[var(--text-secondary)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
        >
          {dark ? '☼' : '☾'}
        </button>

        <button className="hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text)] sm:block">
          ✦ Command
        </button>

        <div className="ml-1 flex items-center gap-2 border-l border-[var(--border)] pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[10px] font-bold text-[var(--accent)]">
            D
          </div>

          <div className="hidden md:block">
            <div className="text-[10px] font-semibold text-[var(--text)]">Dev</div>

            <div className="text-[8px] text-[var(--text-muted)]">Founder</div>
          </div>
        </div>
      </div>
    </header>
  );
}
