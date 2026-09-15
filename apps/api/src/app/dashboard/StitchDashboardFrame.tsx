'use client';

import { useCallback, useRef } from 'react';

const THEMES = ['Pearl Glass', 'Obsidian Aurora', 'Midnight Emerald', 'Cosmic Indigo', 'Sage Mist', 'Titanium Minimal'] as const;
const ACCENTS = ['Indigo', 'Violet', 'Cyan', 'Emerald', 'Gold', 'Monochrome'] as const;
const DENSITIES = ['Comfortable', 'Compact', 'Dense', 'Terminal'] as const;
const FONT_SCALES = ['Small', 'Default', 'Large', 'XL'] as const;

type Settings = {
  theme: string;
  accent: string;
  density: string;
  font_scale: string | number;
};

const defaults: Settings = { theme: 'Pearl Glass', accent: 'Indigo', density: 'Comfortable', font_scale: 'Default' };

const THEME_VARS: Record<string, Record<string, string>> = {
  'Pearl Glass': { bg: '#f8fafc', surface: '#ffffff', surface2: '#f8fafc', text: '#0f172a', secondary: '#64748b', border: '#e2e8f0' },
  'Obsidian Aurora': { bg: '#07090d', surface: '#0e1118', surface2: '#151a24', text: '#f6f7fb', secondary: '#aeb6c8', border: 'rgba(255,255,255,.10)' },
  'Midnight Emerald': { bg: '#07100d', surface: '#0c1713', surface2: '#12211b', text: '#f2faf6', secondary: '#a7c5b7', border: 'rgba(110,231,183,.14)' },
  'Cosmic Indigo': { bg: '#090a17', surface: '#101126', surface2: '#171936', text: '#f5f3ff', secondary: '#b9b5d8', border: 'rgba(167,139,250,.16)' },
  'Sage Mist': { bg: '#f1f3ed', surface: '#fbfcf8', surface2: '#eef1e9', text: '#20251f', secondary: '#586057', border: '#d5dccd' },
  'Titanium Minimal': { bg: '#e9ebee', surface: '#f8f9fa', surface2: '#eef0f2', text: '#17191c', secondary: '#50555d', border: '#cfd3d8' },
};

const ACCENT_MAP: Record<string, string> = {
  Indigo: '#6366f1', Violet: '#8b5cf6', Cyan: '#06b6d4', Emerald: '#10b981', Gold: '#c49a4a', Monochrome: '#64707c',
};

function readLocal(): Settings {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem('nexor-settings-v2') || '{}') as Partial<Settings>) };
  } catch {
    return defaults;
  }
}

export default function StitchDashboardFrame() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const loadSettings = useCallback(async () => {
    const local = readLocal();
    try {
      const response = await fetch('/api/founder/profile', { cache: 'no-store' });
      const data = await response.json();
      return data?.success ? { ...local, ...data.profile } : local;
    } catch {
      return local;
    }
  }, []);

  const enhance = useCallback(async () => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || !doc.body) return;

    const settings = await loadSettings();
    const existing = doc.getElementById('nexor-production-enhancer');
    existing?.remove();

    const style = doc.createElement('style');
    style.id = 'nexor-production-enhancer';
    style.textContent = `
      html,body{min-width:0!important;width:100%!important;overflow-x:hidden!important}
      body{background:${THEME_VARS[settings.theme]?.bg || '#f8fafc'}!important;color:${THEME_VARS[settings.theme]?.text || '#0f172a'}!important}
      aside{transition:transform .2s ease,width .2s ease!important}
      [data-nx-theme='dark'] .bg-white{background-color:${THEME_VARS[settings.theme]?.surface || '#0e1118'}!important}
      [data-nx-theme='dark'] .bg-slate-50,[data-nx-theme='dark'] .bg-slate-50\/50{background-color:${THEME_VARS[settings.theme]?.surface2 || '#151a24'}!important}
      [data-nx-theme='dark'] .text-slate-900,[data-nx-theme='dark'] .text-slate-800,[data-nx-theme='dark'] .text-slate-700{color:${THEME_VARS[settings.theme]?.text || '#f6f7fb'}!important}
      [data-nx-theme='dark'] .text-slate-600,[data-nx-theme='dark'] .text-slate-500,[data-nx-theme='dark'] .text-slate-400{color:${THEME_VARS[settings.theme]?.secondary || '#aeb6c8'}!important}
      [data-nx-theme='dark'] .border-slate-200,[data-nx-theme='dark'] .border-slate-100,[data-nx-theme='dark'] .border-slate-200\/80{border-color:${THEME_VARS[settings.theme]?.border || 'rgba(255,255,255,.1)'}!important}
      [data-nx-theme='accent'] .bg-brand-600{background-color:${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo}!important}
      [data-nx-theme='accent'] .text-brand-600,[data-nx-theme='accent'] .text-brand-700{color:${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo}!important}
      [data-nx-theme='accent'] .border-brand-200,[data-nx-theme='accent'] .border-brand-100{border-color:color-mix(in srgb,${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo} 30%,transparent)!important}
      [data-nx-density='compact'] main{padding:1rem!important;gap:1rem!important} [data-nx-density='compact'] section{padding:1rem!important}
      [data-nx-density='dense'] main{padding:.75rem!important;gap:.75rem!important} [data-nx-density='dense'] section{padding:.8rem!important}
      [data-nx-density='terminal'] main{padding:.5rem!important;gap:.5rem!important} [data-nx-density='terminal'] section{padding:.65rem!important}
      [data-nx-scale='small']{font-size:90%!important} [data-nx-scale='large']{font-size:110%!important} [data-nx-scale='xl']{font-size:120%!important}
      #nexor-mobile-menu{display:none}
      @media(max-width:1023px){
        body{overflow:auto!important}
        aside{position:fixed!important;left:0!important;top:0!important;height:100dvh!important;width:280px!important;max-width:86vw!important;transform:translateX(-105%);box-shadow:20px 0 50px rgba(15,23,42,.18)!important}
        aside.nx-open{transform:translateX(0)}
        #nexor-mobile-menu{display:flex;position:fixed;left:12px;top:12px;z-index:1000;width:42px;height:42px;align-items:center;justify-content:center;border-radius:12px;background:rgba(15,23,42,.92);color:white;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 24px rgba(15,23,42,.22)}
        header{height:auto!important;min-height:64px!important;padding:12px 12px 12px 64px!important;gap:10px!important;align-items:center!important}
        header>div:first-child{width:auto!important;max-width:none!important;flex:1!important}
        header>div:last-child{gap:6px!important;flex-wrap:wrap!important;justify-content:flex-end!important}
        header .hidden.lg\\:flex{display:none!important}
        #global-search{font-size:11px!important}
        #new-workflow{padding:.55rem .7rem!important}
        main{padding:12px!important}
        main>div:first-child{gap:10px!important}
        .overflow-x-auto{scroll-snap-type:x proximity!important;-webkit-overflow-scrolling:touch!important}
        .overflow-x-auto>div{scroll-snap-align:start!important}
        footer{height:auto!important;min-height:40px!important;padding:8px 12px!important;gap:8px!important;overflow:auto!important}
      }
      @media(max-width:640px){
        header .flex.items-center.space-x-4{gap:5px!important}
        header .h-5{display:none!important}
        header .bg-slate-100{display:none!important}
        header .pl-1{display:none!important}
        #new-workflow span{display:none!important}
        #new-workflow{width:38px;height:38px;justify-content:center;padding:0!important}
        main{padding:10px!important}
        main>div:first-child h1{font-size:18px!important}
        main>div:first-child p{font-size:10px!important;line-height:1.5!important}
        section{border-radius:14px!important}
        .grid{grid-template-columns:1fr!important}
        .grid>section{min-width:0!important}
        .overflow-x-auto>div{width:78vw!important;min-width:78vw!important}
        #ai-command{padding-right:82px!important}
        #auto-send,#inspect{width:100%!important}
        #auto-send+button{width:100%!important}
        footer>div:first-child{display:none!important}
      }
      #nx-settings-backdrop{position:fixed;inset:0;z-index:2000;background:rgba(2,6,23,.42);backdrop-filter:blur(5px);display:none}
      #nx-settings-backdrop.nx-visible{display:block}
      #nx-settings-panel{position:absolute;right:0;top:0;height:100%;width:min(420px,94vw);background:${THEME_VARS[settings.theme]?.surface || '#fff'};color:${THEME_VARS[settings.theme]?.text || '#0f172a'};padding:22px;overflow:auto;box-shadow:-20px 0 70px rgba(2,6,23,.25)}
      #nx-settings-panel button,#nx-settings-panel select{font:inherit}
      .nx-opt{width:100%;text-align:left;padding:10px 12px;border:1px solid ${THEME_VARS[settings.theme]?.border || '#e2e8f0'};border-radius:10px;background:${THEME_VARS[settings.theme]?.surface2 || '#f8fafc'};color:inherit;margin-top:7px}
      .nx-opt.nx-active{outline:2px solid ${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo};outline-offset:1px}
      .nx-setting-label{display:block;margin-top:16px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.65}
      #nx-save-settings{width:100%;margin-top:20px;border:0;border-radius:10px;padding:11px;background:${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo};color:#fff;font-weight:800}
    `;
    doc.head.appendChild(style);

    const root = doc.documentElement;
    const isDark = ['Obsidian Aurora', 'Midnight Emerald', 'Cosmic Indigo'].includes(settings.theme);
    root.dataset.nxTheme = isDark ? 'dark' : 'light';
    root.dataset.nxDensity = String(settings.density || 'Comfortable').toLowerCase();
    root.dataset.nxScale = String(settings.font_scale || 'Default').toLowerCase();
    root.dataset.nxAccent = 'accent';

    let mobile = doc.getElementById('nexor-mobile-menu');
    if (!mobile) {
      mobile = doc.createElement('button');
      mobile.id = 'nexor-mobile-menu';
      mobile.setAttribute('aria-label', 'Open navigation');
      mobile.innerHTML = '<i class="ph ph-list text-xl"></i>';
      doc.body.appendChild(mobile);
    }
    mobile.onclick = () => doc.querySelector('aside')?.classList.toggle('nx-open');

    const sidebar = doc.querySelector('aside');
    sidebar?.querySelectorAll('a[data-route]').forEach((anchor) => {
      const href = anchor.getAttribute('href') || '';
      if (href === '/dashboard/settings/studio') {
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          openSettings();
        });
      }
      anchor.addEventListener('click', () => sidebar.classList.remove('nx-open'), { passive: true });
    });

    function buildSettings() {
      let backdrop = doc.getElementById('nx-settings-backdrop');
      if (backdrop) return backdrop;
      backdrop = doc.createElement('div');
      backdrop.id = 'nx-settings-backdrop';
      backdrop.innerHTML = `
        <section id="nx-settings-panel" role="dialog" aria-modal="true" aria-label="NexorAIOS settings">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><div style="font-size:10px;letter-spacing:.12em;opacity:.6;font-weight:800">NEXORAIOS</div><h2 style="font-size:22px;margin:4px 0 0;font-weight:800">Settings</h2></div><button id="nx-close-settings" aria-label="Close settings" style="border:0;background:transparent;font-size:22px;opacity:.65">×</button></div>
          <p style="font-size:11px;line-height:1.6;opacity:.68;margin:8px 0 0">Appearance changes are applied instantly. SAVE persists your command-layer preferences to the database.</p>
          <label class="nx-setting-label">Theme</label><div id="nx-theme-options"></div>
          <label class="nx-setting-label">Accent</label><div id="nx-accent-options"></div>
          <label class="nx-setting-label">Density</label><div id="nx-density-options"></div>
          <label class="nx-setting-label">Font scale</label><div id="nx-font-options"></div>
          <button id="nx-save-settings">SAVE SETTINGS</button>
          <div id="nx-settings-status" style="font-size:10px;opacity:.65;text-align:center;margin-top:10px"></div>
        </section>`;
      doc.body.appendChild(backdrop);
      backdrop.addEventListener('click', (event) => { if (event.target === backdrop) backdrop?.classList.remove('nx-visible'); });
      backdrop.querySelector('#nx-close-settings')?.addEventListener('click', () => backdrop?.classList.remove('nx-visible'));
      return backdrop;
    }

    const openSettings = () => {
      const backdrop = buildSettings();
      const state = { ...settings };
      const renderOptions = (id: string, values: readonly string[], key: keyof Settings) => {
        const target = backdrop.querySelector(`#${id}`);
        if (!target) return;
        target.innerHTML = '';
        values.forEach((value) => {
          const button = doc.createElement('button');
          button.className = `nx-opt${String(state[key]) === value ? ' nx-active' : ''}`;
          button.textContent = value;
          button.onclick = () => { state[key] = value; renderOptions(id, values, key); applyPreview(state); };
          target.appendChild(button);
        });
      };
      renderOptions('nx-theme-options', THEMES, 'theme');
      renderOptions('nx-accent-options', ACCENTS, 'accent');
      renderOptions('nx-density-options', DENSITIES, 'density');
      renderOptions('nx-font-options', FONT_SCALES, 'font_scale');
      const save = backdrop.querySelector('#nx-save-settings') as HTMLButtonElement | null;
      const status = backdrop.querySelector('#nx-settings-status');
      if (save) save.onclick = async () => {
        save.disabled = true;
        if (status) status.textContent = 'Saving…';
        try {
          const response = await fetch('/api/founder/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile: state }) });
          if (!response.ok) throw new Error('Could not save settings');
          localStorage.setItem('nexor-settings-v2', JSON.stringify(state));
          window.parent.dispatchEvent(new CustomEvent('nexor-settings-updated'));
          if (status) status.textContent = 'Saved to production database.';
        } catch (error) {
          if (status) status.textContent = error instanceof Error ? error.message : 'Save failed';
        } finally { save.disabled = false; }
      };
      backdrop.classList.add('nx-visible');
    };

    function applyPreview(state: Settings) {
      const theme = THEME_VARS[state.theme] || THEME_VARS['Pearl Glass'];
      const accent = ACCENT_MAP[state.accent] || ACCENT_MAP.Indigo;
      root.dataset.nxTheme = ['Obsidian Aurora', 'Midnight Emerald', 'Cosmic Indigo'].includes(state.theme) ? 'dark' : 'light';
      root.dataset.nxDensity = String(state.density).toLowerCase();
      root.dataset.nxScale = String(state.font_scale).toLowerCase();
      style.textContent = style.textContent.replace(/background:[^;]+;color:[^;]+;padding:22px/, `background:${theme.surface};color:${theme.text};padding:22px`).replace(/background:${ACCENT_MAP[settings.accent] || ACCENT_MAP.Indigo};color:#fff/, `background:${accent};color:#fff`);
      root.style.setProperty('--nx-accent', accent);
      root.style.setProperty('--nx-bg', theme.bg);
    }

    doc.querySelector('[title="Toggle Sidebar Collapse"]')?.addEventListener('click', () => {
      const current = sidebar?.classList.contains('w-16');
      if (current) { sidebar?.classList.remove('w-16'); sidebar?.classList.add('w-64'); }
      else { sidebar?.classList.remove('w-64'); sidebar?.classList.add('w-16'); }
    });

    const cleanup = () => {
      frame.contentWindow?.removeEventListener('nexor-settings-updated', enhance);
    };
    frame.contentWindow?.addEventListener('nexor-settings-updated', enhance);
    window.addEventListener('storage', enhance);
    window.addEventListener('nexor-settings-updated', enhance);
    void cleanup;
  }, [loadSettings]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#F8FAFC]">
      <iframe ref={frameRef} title="NexorAIOS Founder Command Center" src="/stitch-founder-command-center.html" className="block h-full w-full border-0" onLoad={enhance} />
    </div>
  );
}
