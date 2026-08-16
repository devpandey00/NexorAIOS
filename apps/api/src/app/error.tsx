'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
        <div className="mb-4 font-mono text-xs tracking-[0.2em] text-amber-400">NEXORAIOS · ERROR</div>
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong.</h1>
        <p className="mt-3 text-sm text-neutral-400">The current workspace could not be rendered. Retry the page or return to the command center.</p>
        <button
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
