import { cookies } from 'next/headers';
import AdminLogin from './AdminLogin';

export default async function PortfolioAdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('nexor_portfolio_admin')?.value;
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  const expected = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
    ? (await import('node:crypto')).createHash('sha256').update(`${process.env.ADMIN_EMAIL}:${process.env.ADMIN_PASSWORD}`).digest('hex')
    : '';

  if (!token || !expected || token !== expected) {
    return <AdminLogin />;
  }

  return (
    <main style={{ minHeight: '100vh', background: '#05060a', color: '#f5f7fb', fontFamily: 'ui-sans-serif,system-ui', padding: '28px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div><div style={{ fontSize: 11, letterSpacing: '.18em', color: '#8b5cf6', fontWeight: 800 }}>NEXORAIOS / ADMIN</div><h1 style={{ fontSize: 34, margin: '10px 0 4px' }}>Founder Control Plane</h1><p style={{ color: '#8c93a6', margin: 0 }}>{adminEmail}</p></div>
          <form action="/api/portfolio-admin/logout" method="post"><button style={{ background: 'rgba(255,255,255,.05)', color: '#fff', border: '1px solid rgba(255,255,255,.1)', padding: '10px 14px', borderRadius: 9, cursor: 'pointer' }}>Sign out</button></form>
        </header>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 28 }}>
          {[
            ['SYSTEM', 'Operational', 'Live product surface'],
            ['SECURITY', 'Protected', 'Environment-backed admin auth'],
            ['DEPLOYMENT', 'Vercel', 'Production delivery target'],
            ['ARCHITECTURE', 'Modular', 'Web + API + data layers'],
          ].map(([k, v, s]) => <article key={k} style={{ padding: 22, border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, background: 'rgba(255,255,255,.025)' }}><small style={{ color: '#737b8f', letterSpacing: '.13em' }}>{k}</small><strong style={{ display: 'block', fontSize: 24, margin: '10px 0 4px' }}>{v}</strong><span style={{ color: '#858da0', fontSize: 12 }}>{s}</span></article>)}
        </section>
        <section style={{ marginTop: 28, padding: 26, border: '1px solid rgba(139,92,246,.25)', borderRadius: 14, background: 'radial-gradient(circle at 80% 20%,rgba(124,58,237,.12),transparent 35%),rgba(255,255,255,.02)' }}>
          <div style={{ color: '#a78bfa', fontSize: 10, letterSpacing: '.16em', fontWeight: 800 }}>PORTFOLIO PRESENTATION MODE</div>
          <h2 style={{ fontSize: 28, margin: '10px 0' }}>This control plane proves the admin path is real.</h2>
          <p style={{ maxWidth: 700, lineHeight: 1.7, color: '#8c93a6' }}>Credentials are read only from server environment variables. They are never shipped to the browser or committed to the repository. Set ADMIN_EMAIL and ADMIN_PASSWORD in the Vercel project environment to use your actual login.</p>
          <a href="/portfolio" style={{ color: '#fff', textDecoration: 'none', display: 'inline-block', marginTop: 12 }}>← Back to case study</a>
        </section>
      </div>
    </main>
  );
}
