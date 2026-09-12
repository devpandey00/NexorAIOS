'use client';

import { useTheme } from './ThemeProvider';

const appearances = [
  { id: 'obsidian' as const, name: 'Obsidian Aurora', mode: 'dark', swatches: ['#090812', '#7C5CFF', '#B8D8FF'] },
  { id: 'pearl' as const, name: 'Pearl Glass', mode: 'light', swatches: ['#F7F4EF', '#B58B52', '#24302A'] },
  { id: 'emerald' as const, name: 'Midnight Emerald', mode: 'dark', swatches: ['#07110F', '#31D6A0', '#9FF4D9'] },
  { id: 'indigo' as const, name: 'Cosmic Indigo', mode: 'dark', swatches: ['#090C1C', '#7E7CFF', '#B9BCFF'] },
  { id: 'sand' as const, name: 'Sage Mist', mode: 'light', swatches: ['#F2F4EE', '#91A986', '#283129'] },
  { id: 'graphite' as const, name: 'Titanium Minimal', mode: 'dark', swatches: ['#0C0D0F', '#AEB4BD', '#F3F5F7'] },
] as const;

export function AppearancePicker() {
  const { theme, setTheme, mode, setMode } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {appearances.map((appearance) => {
        const selected = theme === appearance.id;
        return (
          <button
            key={appearance.id}
            type="button"
            onClick={() => {
              setTheme(appearance.id);
              setMode(appearance.mode);
            }}
            aria-pressed={selected}
            className={`group rounded-2xl border p-3 text-left transition-all duration-200 ${
              selected
                ? 'border-nx-teal/60 bg-nx-surface-elevated nx-accent-glow'
                : 'border-nx-border bg-nx-surface hover:border-nx-teal/35 hover:bg-nx-surface-hover'
            }`}
          >
            <div className="mb-3 flex h-16 items-end gap-1 overflow-hidden rounded-xl border border-white/10 p-2" style={{ background: appearance.swatches[0] }}>
              <span className="h-7 w-7 rounded-lg" style={{ background: appearance.swatches[1] }} />
              <span className="h-10 flex-1 rounded-lg opacity-90" style={{ background: appearance.swatches[2] }} />
              <span className="h-5 w-5 rounded-full" style={{ background: appearance.swatches[1] }} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-nx-text-primary">{appearance.name}</div>
                <div className="mt-0.5 text-[11px] text-nx-text-muted">{appearance.mode === 'dark' ? 'Dark · cinematic' : 'Light · refined'}</div>
              </div>
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selected ? 'bg-nx-teal' : 'bg-nx-text-muted/30'}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function AppearancePickerCompact() {
  const { theme, setTheme, setMode } = useTheme();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {appearances.map((appearance) => (
        <button
          key={appearance.id}
          type="button"
          onClick={() => {
            setTheme(appearance.id);
            setMode(appearance.mode);
          }}
          title={appearance.name}
          aria-label={`Use ${appearance.name}`}
          className={`h-8 rounded-full border px-3 text-[11px] font-semibold transition-colors ${
            theme === appearance.id ? 'border-nx-teal/50 bg-nx-teal/10 text-nx-text-primary' : 'border-nx-border text-nx-text-secondary hover:bg-nx-surface-hover'
          }`}
        >
          {appearance.name}
        </button>
      ))}
    </div>
  );
}
