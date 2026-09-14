'use client';

import { FormEvent, useState } from 'react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const response = await fetch('/api/portfolio-admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error ?? 'Login failed.'); setBusy(false); return; }
    window.location.reload();
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 20%,rgba(124,58,237,.18),transparent 35%),#05060a', color: '#f5f7fb', fontFamily: 'ui-sans-serif,system-ui', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 34, background: 'rgba(12,15,24,.82)', boxShadow: '0 30px 100px rgba(0,0,0,.5)' }}>
        <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12, background: 'linear-gradient(135deg,#8b5cf6,#2563eb)', fontWeight: 900, fontSize: 23 }}>N</div>
        <div style={{ marginTop: 24, fontSize: 10, letterSpacing: '.18em', color: '#8f98ad', fontWeight: 800 }}>NEXORAIOS / PRIVATE ACCESS</div>
        <h1 style={{ fontSize: 34, margin: '10px 0 7px' }}>Admin control plane</h1>
        <p style={{ color: '#858da0', lineHeight: 1.6, fontSize: 13 }}>Sign in with the admin credentials configured on the Vercel deployment.</p>
        <form onSubmit={submit} style={{ marginTop: 25, display: 'grid', gap: 13 }}>
          <label style={{ fontSize: 10, color: '#7d8698', letterSpacing: '.1em' }}>ADMIN EMAIL<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required style={inputStyle} /></label>
          <label style={{ fontSize: 10, color: '#7d8698', letterSpacing: '.1em' }}>PASSWORD<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required style={inputStyle} /></label>
          {error && <div style={{ color: '#fca5a5', fontSize: 12, padding: 12, border: '1px solid rgba(248,113,113,.25)', borderRadius: 8, background: 'rgba(127,29,29,.16)' }}>{error}</div>}
          <button disabled={busy} type="submit" style={{ marginTop: 5, border: 0, borderRadius: 9, padding: 13, color: '#fff', background: busy ? '#3f3f46' : 'linear-gradient(100deg,#7c3aed,#5b21b6)', fontWeight: 800, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Authenticating…' : 'Enter control plane →'}</button>
        </form>
        <a href="/portfolio" style={{ display: 'block', marginTop: 20, color: '#8c93a6', fontSize: 12, textDecoration: 'none' }}>← Return to NexorAIOS case study</a>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 7, padding: '12px 13px', borderRadius: 9, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.045)', color: '#fff', outline: 'none' };
