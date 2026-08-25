'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Login failed');
      }

      // Confirm cookie persistence before navigating. This removes the mobile
      // Safari/Chrome race where the redirect can happen before the cookie is usable.
      const session = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const sessionData = await session.json().catch(() => ({}));
      if (!session.ok || !sessionData?.success) {
        throw new Error('Session was created but the browser could not persist it. Please retry once.');
      }

      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#050505', color: '#fff' }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 420, padding: 32, border: '1px solid #242424', borderRadius: 18, background: '#0d0d0d' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>NexorAIOS</h1>
        <p style={{ color: '#999', marginBottom: 28 }}>Sign in to your automation workspace.</p>
        <label style={{ display: 'block', marginBottom: 8 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" inputMode="email" required style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 18, borderRadius: 10, border: '1px solid #333', background: '#111', color: '#fff' }} />
        <label style={{ display: 'block', marginBottom: 8 }}>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required style={{ width: '100%', boxSizing: 'border-box', padding: 12, marginBottom: 18, borderRadius: 10, border: '1px solid #333', background: '#111', color: '#fff' }} />
        {error ? <p role="alert" style={{ color: '#ff6b6b' }}>{error}</p> : null}
        <button disabled={loading} type="submit" style={{ width: '100%', padding: 13, border: 0, borderRadius: 10, background: '#fff', color: '#000', fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
