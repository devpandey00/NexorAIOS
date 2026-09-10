'use client';

import { useEffect } from 'react';

const themes: Record<string, Record<string, string>> = {
  'Executive Pearl': { '--bg':'#f7f8fa','--surface':'#ffffff','--surface-2':'#f3f5f7','--surface-3':'#e9edf2','--border':'#e4e7ec','--border-strong':'#cfd5dd','--text':'#101828','--text-secondary':'#475467','--text-muted':'#98a2b3' },
  'Light': { '--bg':'#ffffff','--surface':'#ffffff','--surface-2':'#f5f7fa','--surface-3':'#e8ecf2','--border':'#dfe3ea','--border-strong':'#c7ced9','--text':'#111827','--text-secondary':'#4b5563','--text-muted':'#9ca3af' },
  'Obsidian': { '--bg':'#0b0f17','--surface':'#111827','--surface-2':'#181c24','--surface-3':'#232936','--border':'rgba(255,255,255,.08)','--border-strong':'rgba(255,255,255,.15)','--text':'#f4f6fb','--text-secondary':'#aeb7c8','--text-muted':'#778196' },
  'Gold Executive': { '--bg':'#faf8f2','--surface':'#fffdf8','--surface-2':'#f4f0e5','--surface-3':'#eae3d2','--border':'#e6decc','--border-strong':'#d5c8ad','--text':'#211d16','--text-secondary':'#62594b','--text-muted':'#9b917f' },
};

const accents: Record<string, string> = { Indigo:'#5b5fef', Violet:'#7c3aed', Cyan:'#0891b2', Emerald:'#059669', Gold:'#b7791f', Monochrome:'#475467' };

export default function ThemeRuntime() {
  useEffect(() => {
    const apply = () => {
      let values: Record<string, unknown> = {};
      try { values = JSON.parse(localStorage.getItem('nexor-settings-v3') || '{}'); } catch {}
      const root = document.documentElement;
      const theme = String(values.theme || 'Executive Pearl');
      const palette = themes[theme] || themes['Executive Pearl'];
      Object.entries(palette).forEach(([key, value]) => root.style.setProperty(key, value));
      const accent = accents[String(values.accent || 'Indigo')] || accents.Indigo;
      root.style.setProperty('--primary', accent);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--primary-soft', `color-mix(in srgb, ${accent} 10%, transparent)`);
      root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 10%, transparent)`);
      root.style.setProperty('--ai', theme === 'Obsidian' ? '#4cd7f6' : '#12a594');
      root.classList.toggle('dark', theme === 'Obsidian');
      const density = String(values.density || 'Comfortable');
      root.dataset.density = density.toLowerCase();
      const scale = Number(values.font_scale || 100);
      root.style.setProperty('--nexor-font-scale', `${Math.min(125, Math.max(85, scale)) / 100}`);
      document.body.style.fontSize = `calc(14px * var(--nexor-font-scale))`;
    };
    apply();
    window.addEventListener('storage', apply);
    window.addEventListener('nexor-settings-updated', apply);
    return () => { window.removeEventListener('storage', apply); window.removeEventListener('nexor-settings-updated', apply); };
  }, []);
  return null;
}
