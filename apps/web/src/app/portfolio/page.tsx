'use client';

import { useState } from 'react';

const capabilities = [
  ['01', 'AI Command Layer', 'A central operating surface for AI-assisted business decisions, actions and workflows.'],
  ['02', 'Revenue Intelligence', 'Executive KPIs, revenue movement, acquisition funnel and commercial health in one view.'],
  ['03', 'CRM + Pipeline', 'Pipeline visibility, attention queues and recommended actions designed around execution.'],
  ['04', 'Automation Ready', 'API-first architecture prepared for integrations, webhooks, scheduled jobs and agent workflows.'],
  ['05', 'Admin Control Plane', 'Founder/admin controls, security settings, audit-oriented controls and operational visibility.'],
  ['06', 'Production Architecture', 'Next.js App Router, TypeScript, PostgreSQL/Prisma and Vercel-ready deployment architecture.'],
];

const buildSteps = [
  ['01', 'Discover', 'Map business workflows, data sources, bottlenecks and the decisions the operator actually needs to make.'],
  ['02', 'Architect', 'Separate the presentation layer, API layer, database layer and integrations so the system can scale without becoming brittle.'],
  ['03', 'Build', 'Ship reusable dashboard components, API routes, data contracts, authentication and operational controls.'],
  ['04', 'Verify', 'Test routes, loading/error states, data freshness, responsive behaviour and production deployment paths.'],
  ['05', 'Iterate', 'Turn feedback into tighter workflows, better information hierarchy and higher automation coverage.'],
];

export default function NexorPortfolio() {
  const [active, setActive] = useState('overview');

  return (
    <main className="nx-portfolio">
      <div className="nx-noise" />
      <div className="nx-grid" />
      <div className="nx-orb nx-orb-a" />
      <div className="nx-orb nx-orb-b" />

      <nav className="nx-nav">
        <a href="/portfolio" className="nx-brand"><span className="nx-mark">N</span><span>NEXOR<span className="nx-dim">AIOS</span></span></a>
        <div className="nx-nav-links">
          {['overview', 'capabilities', 'architecture', 'build'].map((item) => (
            <button key={item} onClick={() => setActive(item)} className={active === item ? 'active' : ''}>
              {item}
            </button>
          ))}
        </div>
        <div className="nx-nav-actions">
          <a href="/" className="nx-ghost">Open OS</a>
          <a href="/portfolio/admin" className="nx-admin">Admin <span>↗</span></a>
        </div>
      </nav>

      <section id="overview" className="nx-hero">
        <div className="nx-hero-copy">
          <div className="nx-eyebrow"><span className="nx-live" /> PERSONAL PROJECT · PRODUCTION BUILD · 2026</div>
          <h1>Nexor<span>AIOS</span></h1>
          <p className="nx-lead">An AI operating system for businesses — built to turn fragmented tools, data and workflows into one intelligent command layer.</p>
          <div className="nx-hero-buttons">
            <a href="/" className="nx-primary">Launch live dashboard <span>→</span></a>
            <a href="#architecture" className="nx-secondary">Explore the architecture</a>
          </div>
          <div className="nx-proof-row">
            <div><strong>AI</strong><span>Operating Layer</span></div>
            <div><strong>API</strong><span>Automation Ready</span></div>
            <div><strong>DB</strong><span>Persistent Data</span></div>
            <div><strong>DX</strong><span>Production UX</span></div>
          </div>
        </div>

        <div className="nx-command-card">
          <div className="nx-card-top"><span><i /> SYSTEM ONLINE</span><span>LIVE / 01</span></div>
          <div className="nx-command-core">
            <div className="nx-ring ring-1" /><div className="nx-ring ring-2" /><div className="nx-ring ring-3" />
            <div className="nx-core"><b>N</b><small>AIOS</small></div>
            <span className="nx-pulse p1" /><span className="nx-pulse p2" /><span className="nx-pulse p3" />
          </div>
          <div className="nx-signal-grid">
            <div><small>REVENUE SIGNAL</small><strong>+24.8%</strong><em>↑ 8.4%</em></div>
            <div><small>ACTIVE WORKFLOWS</small><strong>128</strong><em>+19 today</em></div>
            <div><small>DECISIONS</small><strong>4,812</strong><em>AI-assisted</em></div>
            <div><small>UPTIME TARGET</small><strong>99.9%</strong><em>production</em></div>
          </div>
          <div className="nx-terminal"><span>nexor://command</span><b>system.intelligence</b><i>▮</i></div>
        </div>
      </section>

      <section id="capabilities" className="nx-section">
        <div className="nx-section-head"><div><span className="nx-kicker">WHAT I BUILT</span><h2>More than a dashboard.</h2></div><p>NexorAIOS is presented as a real product system, not a static portfolio mockup. The interface exposes the thinking behind the build.</p></div>
        <div className="nx-cap-grid">
          {capabilities.map(([num, title, body]) => <article key={num} className="nx-cap"><span>{num}</span><h3>{title}</h3><p>{body}</p><b>Explore module ↗</b></article>)}
        </div>
      </section>

      <section id="architecture" className="nx-section nx-architecture">
        <div className="nx-section-head"><div><span className="nx-kicker">SYSTEM ARCHITECTURE</span><h2>Designed as an operating layer.</h2></div><p>Each layer has a clear job: interface, intelligence, APIs, data and integrations. That separation makes the product easier to extend and debug.</p></div>
        <div className="nx-stack">
          <div className="nx-layer layer-top"><span>01</span><div><b>COMMAND EXPERIENCE</b><small>Executive dashboard · AI workspace · activity · alerts · actions</small></div><strong>UX</strong></div>
          <div className="nx-connector" />
          <div className="nx-layer"><span>02</span><div><b>APPLICATION + API LAYER</b><small>Next.js App Router · API routes · typed contracts · authentication</small></div><strong>APP</strong></div>
          <div className="nx-connector" />
          <div className="nx-layer"><span>03</span><div><b>INTELLIGENCE + AUTOMATION</b><small>AI agents · recommendations · workflow orchestration · integrations</small></div><strong>AI</strong></div>
          <div className="nx-connector" />
          <div className="nx-layer"><span>04</span><div><b>DATA + OPERATIONS</b><small>PostgreSQL · Prisma · persistence · auditability · observability</small></div><strong>DATA</strong></div>
          <div className="nx-connector" />
          <div className="nx-layer layer-bottom"><span>05</span><div><b>DEPLOYMENT</b><small>GitHub → Vercel → production · preview environments · continuous delivery</small></div><strong>EDGE</strong></div>
        </div>
      </section>

      <section id="build" className="nx-section">
        <div className="nx-section-head"><div><span className="nx-kicker">HOW IT WAS BUILT</span><h2>From idea to operating system.</h2></div><p>The build story is part of the product. A reviewer can see the decisions, architecture and engineering process instead of only seeing a polished screen.</p></div>
        <div className="nx-build-grid">
          {buildSteps.map(([num, title, body]) => <div className="nx-step" key={num}><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}
        </div>
      </section>

      <section className="nx-demo">
        <div><span className="nx-kicker">SEE THE REAL PRODUCT</span><h2>Enough talking. Open the OS.</h2><p>The live dashboard is the working surface. This page explains the engineering behind it.</p></div>
        <div className="nx-demo-actions"><a href="/" className="nx-primary">Open NexorAIOS →</a><a href="/portfolio/admin" className="nx-secondary">Admin control plane</a></div>
      </section>

      <footer className="nx-footer"><span>© 2026 NexorAIOS</span><span>Built with Next.js · TypeScript · Prisma · PostgreSQL · Vercel</span><span>Engineering portfolio / case study</span></footer>

      <style jsx global>{`
        :root{--nx-bg:#05060a;--nx-panel:rgba(12,15,24,.72);--nx-line:rgba(255,255,255,.10);--nx-text:#f5f7fb;--nx-muted:#8c93a6;--nx-accent:#8b5cf6;--nx-cyan:#22d3ee}
        html{scroll-behavior:smooth}.nx-portfolio{position:relative;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 70% 12%,rgba(124,58,237,.14),transparent 28%),radial-gradient(circle at 20% 60%,rgba(34,211,238,.08),transparent 25%),var(--nx-bg);color:var(--nx-text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.nx-noise{position:fixed;inset:0;opacity:.035;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E")}.nx-grid{position:absolute;inset:0;height:850px;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(to bottom,#000,transparent)}.nx-orb{position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none}.nx-orb-a{width:420px;height:420px;right:-150px;top:100px;background:rgba(124,58,237,.18)}.nx-orb-b{width:300px;height:300px;left:-160px;top:720px;background:rgba(34,211,238,.12)}.nx-nav{position:relative;z-index:5;max-width:1320px;margin:auto;padding:24px 28px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--nx-line)}.nx-brand{display:flex;align-items:center;gap:10px;color:#fff;text-decoration:none;font-weight:800;letter-spacing:.14em;font-size:13px}.nx-mark{display:grid;place-items:center;width:30px;height:30px;border:1px solid rgba(255,255,255,.2);border-radius:9px;background:linear-gradient(135deg,rgba(139,92,246,.35),rgba(34,211,238,.12));box-shadow:0 0 30px rgba(139,92,246,.25)}.nx-dim{color:#7f8799}.nx-nav-links{display:flex;gap:8px}.nx-nav-links button{border:0;background:transparent;color:#737b8f;padding:9px 12px;border-radius:8px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;cursor:pointer}.nx-nav-links button.active,.nx-nav-links button:hover{color:#fff;background:rgba(255,255,255,.06)}.nx-nav-actions{display:flex;gap:9px;align-items:center}.nx-ghost,.nx-admin,.nx-primary,.nx-secondary{display:inline-flex;align-items:center;gap:10px;text-decoration:none;font-size:12px;font-weight:700}.nx-ghost,.nx-secondary{color:#c0c6d3}.nx-ghost{padding:10px 12px}.nx-admin{color:#fff;padding:10px 14px;border:1px solid var(--nx-line);border-radius:9px;background:rgba(255,255,255,.045)}.nx-hero{position:relative;z-index:2;max-width:1320px;margin:auto;padding:90px 28px 100px;display:grid;grid-template-columns:1.02fr .98fr;gap:70px;align-items:center;min-height:760px}.nx-eyebrow,.nx-kicker{font-size:10px;letter-spacing:.18em;color:#8f98ad;font-weight:800}.nx-live{display:inline-block;width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 14px #34d399;margin-right:8px}.nx-hero h1{font-size:clamp(70px,10vw,148px);line-height:.86;letter-spacing:-.075em;margin:25px 0 28px;font-weight:900}.nx-hero h1 span{display:block;background:linear-gradient(100deg,#fff 10%,#a78bfa 48%,#22d3ee 100%);-webkit-background-clip:text;background-clip:text;color:transparent}.nx-lead{max-width:660px;font-size:20px;line-height:1.55;color:#aeb5c4}.nx-hero-buttons{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap}.nx-primary{padding:13px 17px;border-radius:10px;color:#fff;background:linear-gradient(100deg,#7c3aed,#5b21b6);box-shadow:0 15px 50px rgba(124,58,237,.28)}.nx-primary:hover{transform:translateY(-2px)}.nx-secondary{padding:13px 4px}.nx-proof-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:55px;padding-top:22px;border-top:1px solid var(--nx-line)}.nx-proof-row div{display:flex;flex-direction:column;gap:4px}.nx-proof-row strong{font-size:16px}.nx-proof-row span{font-size:9px;color:#727a8c;text-transform:uppercase;letter-spacing:.1em}.nx-command-card{border:1px solid rgba(255,255,255,.12);border-radius:22px;background:linear-gradient(145deg,rgba(21,25,39,.88),rgba(7,9,15,.76));box-shadow:0 35px 100px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.06);overflow:hidden;backdrop-filter:blur(20px);animation:float 7s ease-in-out infinite}.nx-card-top{display:flex;justify-content:space-between;padding:17px 19px;border-bottom:1px solid var(--nx-line);font-size:9px;letter-spacing:.14em;color:#778095}.nx-card-top i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399;margin-right:7px}.nx-command-core{height:350px;display:grid;place-items:center;position:relative;overflow:hidden;background:radial-gradient(circle,rgba(124,58,237,.12),transparent 48%)}.nx-ring{position:absolute;border:1px solid rgba(167,139,250,.18);border-radius:50%;animation:spin 18s linear infinite}.ring-1{width:230px;height:230px}.ring-2{width:310px;height:310px;animation-duration:25s;animation-direction:reverse}.ring-3{width:390px;height:390px;animation-duration:34s}.nx-core{width:108px;height:108px;border-radius:30px;display:grid;place-items:center;background:linear-gradient(145deg,#8b5cf6,#1d4ed8);box-shadow:0 0 80px rgba(124,58,237,.55),inset 0 1px rgba(255,255,255,.5);z-index:2}.nx-core b{font-size:50px;line-height:.8}.nx-core small{font-size:8px;letter-spacing:.28em;margin-left:4px}.nx-pulse{position:absolute;width:5px;height:5px;background:#22d3ee;border-radius:50%;box-shadow:0 0 18px #22d3ee}.p1{top:28%;left:28%;animation:orbit 6s linear infinite}.p2{top:63%;right:22%;animation:orbit 9s linear infinite reverse}.p3{bottom:18%;left:44%;animation:orbit 12s linear infinite}.nx-signal-grid{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--nx-line)}.nx-signal-grid>div{padding:17px 19px;border-right:1px solid var(--nx-line);border-bottom:1px solid var(--nx-line)}.nx-signal-grid>div:nth-child(2n){border-right:0}.nx-signal-grid small{display:block;font-size:8px;color:#70798c;letter-spacing:.13em}.nx-signal-grid strong{display:block;font-size:21px;margin:5px 0}.nx-signal-grid em{font-style:normal;font-size:9px;color:#34d399}.nx-terminal{display:flex;gap:10px;padding:14px 19px;font:10px ui-monospace,SFMono-Regular,Menlo,monospace;color:#7c8598}.nx-terminal b{color:#a7f3d0;font-weight:500}.nx-terminal i{color:#a78bfa}.nx-section{position:relative;z-index:2;max-width:1320px;margin:auto;padding:110px 28px}.nx-section-head{display:flex;justify-content:space-between;gap:60px;align-items:end;margin-bottom:45px}.nx-section-head h2{font-size:clamp(36px,5vw,68px);letter-spacing:-.055em;line-height:1;margin:14px 0 0}.nx-section-head p{max-width:460px;color:#858da0;line-height:1.7;font-size:14px}.nx-cap-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--nx-line);border-radius:16px;overflow:hidden}.nx-cap{min-height:245px;padding:28px;border-right:1px solid var(--nx-line);border-bottom:1px solid var(--nx-line);background:rgba(255,255,255,.018);transition:.3s}.nx-cap:nth-child(3n){border-right:0}.nx-cap:hover{background:rgba(139,92,246,.06);transform:translateY(-2px)}.nx-cap>span,.nx-step>span{font:10px ui-monospace,monospace;color:#6f7789}.nx-cap h3{font-size:20px;margin:38px 0 12px}.nx-cap p{color:#858da0;font-size:13px;line-height:1.65;max-width:330px}.nx-cap b{display:block;margin-top:22px;font-size:9px;color:#a78bfa;letter-spacing:.08em;text-transform:uppercase}.nx-architecture{padding-top:80px}.nx-stack{max-width:940px;margin:55px auto 0}.nx-layer{display:grid;grid-template-columns:45px 1fr 70px;align-items:center;gap:20px;padding:23px 26px;border:1px solid var(--nx-line);border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.015));box-shadow:inset 0 1px rgba(255,255,255,.04)}.nx-layer span{font:10px ui-monospace,monospace;color:#667084}.nx-layer b{display:block;font-size:11px;letter-spacing:.12em}.nx-layer small{display:block;color:#7f8799;font-size:12px;margin-top:6px}.nx-layer strong{text-align:right;font:10px ui-monospace,monospace;color:#a78bfa}.layer-top{border-color:rgba(139,92,246,.38);box-shadow:0 0 50px rgba(139,92,246,.08)}.layer-bottom{border-color:rgba(34,211,238,.2)}.nx-connector{height:28px;width:1px;margin:auto;background:linear-gradient(#7c3aed,#22d3ee)}.nx-build-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;border:1px solid var(--nx-line);background:var(--nx-line);border-radius:14px;overflow:hidden}.nx-step{background:#080a10;padding:24px;min-height:240px}.nx-step h3{font-size:18px;margin:45px 0 12px}.nx-step p{font-size:12px;line-height:1.7;color:#7f8799}.nx-demo{position:relative;z-index:2;max-width:1264px;margin:50px auto 100px;padding:65px;border:1px solid rgba(139,92,246,.28);border-radius:22px;background:radial-gradient(circle at 80% 50%,rgba(124,58,237,.18),transparent 38%),rgba(12,14,23,.8);display:flex;justify-content:space-between;gap:40px;align-items:end}.nx-demo h2{font-size:clamp(34px,5vw,62px);letter-spacing:-.055em;line-height:1;margin:12px 0}.nx-demo p{color:#858da0}.nx-demo-actions{display:flex;gap:18px;flex-wrap:wrap}.nx-footer{position:relative;z-index:2;max-width:1320px;margin:auto;padding:24px 28px 40px;border-top:1px solid var(--nx-line);display:flex;justify-content:space-between;gap:20px;color:#5f687a;font-size:9px;text-transform:uppercase;letter-spacing:.1em}.nx-footer span:nth-child(2){color:#737c8e}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{50%{transform:translateY(-8px)}}@keyframes orbit{50%{transform:translate(80px,-40px) scale(1.4)}}@media(max-width:900px){.nx-nav-links{display:none}.nx-hero{grid-template-columns:1fr;padding-top:65px}.nx-hero h1{font-size:80px}.nx-cap-grid{grid-template-columns:1fr}.nx-cap{border-right:0}.nx-build-grid{grid-template-columns:1fr 1fr}.nx-demo,.nx-section-head{flex-direction:column;align-items:flex-start}.nx-footer{flex-direction:column}.nx-signal-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.nx-nav{padding:18px}.nx-nav-actions .nx-ghost{display:none}.nx-hero,.nx-section{padding-left:18px;padding-right:18px}.nx-hero h1{font-size:64px}.nx-lead{font-size:17px}.nx-proof-row{grid-template-columns:1fr 1fr}.nx-command-core{height:280px}.nx-layer{grid-template-columns:30px 1fr}.nx-layer strong{display:none}.nx-build-grid{grid-template-columns:1fr}.nx-demo{margin:30px 18px 70px;padding:35px 25px}.nx-footer{padding-left:18px;padding-right:18px}}
        @media (prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
      `}</style>
    </main>
  );
}
