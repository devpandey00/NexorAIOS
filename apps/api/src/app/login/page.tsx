'use client';

import Link from 'next/link';
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
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Login failed');
      const session = await fetch('/api/auth/me', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
      const sessionData = await session.json().catch(() => ({}));
      if (!session.ok || !sessionData?.success) throw new Error('Session was created but could not be persisted. Please retry.');
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <main className="nxl-login">
      <div className="nxl-grid" /><div className="nxl-glow nxl-g1" /><div className="nxl-glow nxl-g2" />
      <Link href="/" className="nxl-back">← Back to NexorAIOS</Link>
      <div className="nxl-layout">
        <section className="nxl-story">
          <div className="nxl-status"><i /> NEXOR MEDIA · FOUNDER CONTROL PLANE</div>
          <h1>Enter the<br /><em>operating system.</em></h1>
          <p>The public page explains the product. This gate opens the actual NexorAIOS command environment.</p>
          <div className="nxl-points"><span>01 <b>Authenticated workspace</b></span><span>02 <b>Founder-level controls</b></span><span>03 <b>Live business telemetry</b></span></div>
        </section>
        <form onSubmit={submit} className="nxl-card">
          <div className="nxl-card-head"><div className="nxl-logo">N</div><div><b>NEXOR</b><small>AI OPERATING SYSTEM</small></div><span><i /> SECURE</span></div>
          <div className="nxl-card-title"><label>ADMIN ACCESS</label><h2>Welcome back.</h2><p>Use your NexorAIOS administrator credentials.</p></div>
          <label className="nxl-field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" inputMode="email" placeholder="admin@yourdomain.com" required /></label>
          <label className="nxl-field"><span>Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="••••••••••••" required /></label>
          {error ? <div className="nxl-error" role="alert">{error}</div> : null}
          <button disabled={loading} type="submit">{loading ? 'AUTHENTICATING…' : 'ENTER COMMAND CENTER'} <b>→</b></button>
          <small className="nxl-secure-note">Session protected · credentials remain server-side · encrypted cookie</small>
        </form>
      </div>
      <style jsx global>{`
        .nxl-login{min-height:100dvh;background:#070812;color:#f5f6fb;position:relative;overflow:hidden;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:grid;place-items:center}.nxl-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(#000,transparent)}.nxl-glow{position:absolute;border-radius:50%;filter:blur(110px)}.nxl-g1{width:500px;height:500px;right:-200px;top:-100px;background:rgba(100,77,255,.18)}.nxl-g2{width:400px;height:400px;left:-180px;bottom:-150px;background:rgba(34,211,238,.08)}.nxl-back{position:absolute;z-index:4;left:32px;top:28px;color:#858da2;font-size:11px}.nxl-back:hover{color:#fff}.nxl-layout{position:relative;z-index:2;width:min(1160px,calc(100% - 48px));display:grid;grid-template-columns:1fr 440px;gap:90px;align-items:center}.nxl-story .nxl-status{font-size:9px;letter-spacing:.18em;color:#737c92;font-weight:800}.nxl-status i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#39e0a0;box-shadow:0 0 13px #39e0a0;margin-right:9px}.nxl-story h1{font-size:clamp(58px,7vw,100px);line-height:.9;letter-spacing:-.07em;margin:25px 0}.nxl-story h1 em{font-style:normal;background:linear-gradient(100deg,#fff,#9b8cff,#2bd3ed);-webkit-background-clip:text;color:transparent}.nxl-story>p{max-width:560px;color:#858da2;line-height:1.8;font-size:15px}.nxl-points{margin-top:40px;border-top:1px solid rgba(255,255,255,.09);display:grid;grid-template-columns:1fr;gap:14px;padding-top:20px;color:#626b80;font-size:9px;letter-spacing:.12em}.nxl-points b{color:#aab0c0;margin-left:10px;font-weight:600}.nxl-card{padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:linear-gradient(145deg,rgba(19,22,38,.93),rgba(7,9,16,.88));box-shadow:0 40px 110px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.06);backdrop-filter:blur(25px)}.nxl-card-head{display:flex;align-items:center;gap:10px;padding-bottom:23px;border-bottom:1px solid rgba(255,255,255,.08)}.nxl-logo{width:38px;height:38px;display:grid;place-items:center;border-radius:9px;background:linear-gradient(135deg,#29244e,#0b0d18);border:1px solid rgba(255,255,255,.12);font-weight:900;font-size:20px;color:#a095ff}.nxl-card-head b{display:block;letter-spacing:.16em;font-size:12px}.nxl-card-head small{display:block;color:#656e83;font-size:7px;letter-spacing:.1em;margin-top:3px}.nxl-card-head>span{margin-left:auto;font-size:8px;color:#62dca9;letter-spacing:.12em}.nxl-card-head>span i{display:inline-block;width:5px;height:5px;background:#44df9f;border-radius:50%;margin-right:5px;box-shadow:0 0 9px #44df9f}.nxl-card-title{padding:28px 0 20px}.nxl-card-title label{font-size:8px;color:#756bff;letter-spacing:.17em;font-weight:800}.nxl-card-title h2{font-size:30px;letter-spacing:-.04em;margin:10px 0 5px}.nxl-card-title p{color:#6e768b;font-size:11px}.nxl-field{display:block;margin-top:16px}.nxl-field span{display:block;color:#8d95a8;font-size:9px;text-transform:uppercase;letter-spacing:.12em;margin-bottom:7px}.nxl-field input{width:100%;height:48px;border-radius:9px;border:1px solid rgba(255,255,255,.1);outline:none;background:#090b14;color:#fff;padding:0 13px;font-size:13px;transition:border-color .2s,box-shadow .2s}.nxl-field input:focus{border-color:rgba(124,111,255,.7);box-shadow:0 0 0 3px rgba(124,111,255,.12)}.nxl-error{margin-top:15px;padding:11px 12px;border-radius:8px;border:1px solid rgba(248,113,113,.25);background:rgba(127,29,29,.15);color:#fca5a5;font-size:10px}.nxl-card button{width:100%;height:50px;margin-top:20px;border:0;border-radius:9px;background:linear-gradient(100deg,#7568ff,#4d3fc7);color:#fff;font-weight:800;font-size:10px;letter-spacing:.08em;cursor:pointer;box-shadow:0 16px 40px rgba(91,73,230,.25)}.nxl-card button:disabled{opacity:.65;cursor:wait}.nxl-card button b{float:right;font-size:16px;line-height:10px}.nxl-secure-note{display:block;text-align:center;color:#555e72;font-size:8px;margin-top:17px;letter-spacing:.06em}@media(max-width:850px){.nxl-layout{grid-template-columns:1fr;gap:35px;width:min(560px,calc(100% - 36px));padding:75px 0 40px}.nxl-story{text-align:center}.nxl-story h1{font-size:62px}.nxl-story>p{margin:auto}.nxl-points{text-align:left}.nxl-back{left:20px;top:20px}}@media(max-width:520px){.nxl-story h1{font-size:48px}.nxl-card{padding:21px}.nxl-login{place-items:start}.nxl-layout{padding-top:75px}}
      `}</style>
    </main>
  );
}
