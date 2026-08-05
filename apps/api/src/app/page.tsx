import Link from 'next/link';

export default function Home() {
  return (
    <main
      style={{
        padding: 50,
        fontFamily: 'Arial, sans-serif',
        maxWidth: 900,
        margin: '0 auto',
      }}
    >
      <h1>NexorAIOS</h1>

      <p>Enterprise AI Operating System for Lead Generation & Client Acquisition</p>

      <div
        style={{
          display: 'flex',
          gap: 20,
          marginTop: 30,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            padding: '12px 24px',
            background: '#111',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Open Dashboard
        </Link>

        <Link
          href="/api/leads"
          style={{
            padding: '12px 24px',
            border: '1px solid #111',
            borderRadius: 8,
            textDecoration: 'none',
            color: '#111',
          }}
        >
          View API
        </Link>
      </div>
    </main>
  );
}
