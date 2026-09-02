'use client';

import { useEffect, useRef, useState } from 'react';

export interface Command {
  id: string;
  label: string;
  run: () => void;
}

/**
 * Cmd/Ctrl+K command surface. Only wired to `onRefresh` for now — there
 * are no other pages (/leads, /campaigns, etc.) in this app yet to route
 * to, and the natural-language commands from the design brief
 * ("show my highest-value leads", "compare acquisition month over
 * month"...) would need either those pages or a real query endpoint to
 * answer honestly. Wiring them here would just be more console.log
 * placeholders — better to add them as those surfaces get built.
 */
export function CommandPalette({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [{ id: 'refresh', label: 'Refresh dashboard data', run: onRefresh }];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-nx-control border border-nx-border bg-nx-surface px-3 py-1.5 text-[13px] text-nx-text-muted transition-colors duration-150 hover:bg-nx-surface-hover">
        <span aria-hidden="true">⌘K</span>
        Command…
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-nx-panel border border-nx-gold/40 bg-nx-surface-elevated">
        <input ref={inputRef} placeholder="Type a command…" className="w-full border-b border-nx-border bg-transparent px-4 py-3.5 text-[14px] text-nx-text-primary placeholder:text-nx-text-muted focus:outline-none" />
        <ul className="py-1">
          {commands.map((cmd) => (
            <li key={cmd.id}>
              <button
                onClick={() => {
                  cmd.run();
                  setOpen(false);
                }}
                className="flex w-full items-center px-4 py-2.5 text-left text-[13px] text-nx-text-primary transition-colors duration-150 hover:bg-nx-surface-hover"
              >
                {cmd.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
