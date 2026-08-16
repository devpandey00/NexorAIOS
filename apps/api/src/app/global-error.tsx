'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ color: '#fbbf24', fontSize: 12, letterSpacing: '0.2em', marginBottom: 16 }}>NEXORAIOS · FATAL ERROR</div>
            <h1 style={{ fontSize: 36, margin: 0 }}>The application failed to render.</h1>
            <p style={{ color: '#a3a3a3', lineHeight: 1.7 }}>Reload the application after the underlying error has been resolved.</p>
            <button
              onClick={() => reset()}
              style={{ marginTop: 20, border: 0, borderRadius: 12, padding: '12px 20px', background: '#fbbf24', color: '#000', fontWeight: 700, cursor: 'pointer' }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
