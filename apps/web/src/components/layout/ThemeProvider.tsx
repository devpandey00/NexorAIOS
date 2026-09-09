'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AppearanceMode = 'light' | 'dark' | 'system';
type ThemeName = 'obsidian' | 'forest' | 'emerald' | 'midnight' | 'ocean' | 'graphite' | 'aurora' | 'indigo' | 'slate' | 'arctic' | 'pearl' | 'sand' | 'sunset' | 'monochrome' | 'studio';
type Density = 'comfortable' | 'compact' | 'dense';

type ThemeContextValue = {
  mode: AppearanceMode;
  theme: ThemeName;
  density: Density;
  setMode: (mode: AppearanceMode) => void;
  setTheme: (theme: ThemeName) => void;
  setDensity: (density: Density) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const MODE_KEY = 'nexor-appearance-mode';
const THEME_KEY = 'nexor-appearance-theme';
const DENSITY_KEY = 'nexor-density';

function resolveMode(mode: AppearanceMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>('dark');
  const [theme, setThemeState] = useState<ThemeName>('obsidian');
  const [density, setDensityState] = useState<Density>('comfortable');

  useEffect(() => {
    const storedMode = (window.localStorage.getItem(MODE_KEY) as AppearanceMode | null) ?? 'system';
    const storedTheme = (window.localStorage.getItem(THEME_KEY) as ThemeName | null) ?? 'obsidian';
    const storedDensity = (window.localStorage.getItem(DENSITY_KEY) as Density | null) ?? 'comfortable';
    setModeState(['light', 'dark', 'system'].includes(storedMode) ? storedMode : 'system');
    setThemeState(storedTheme);
    setDensityState(['comfortable', 'compact', 'dense'].includes(storedDensity) ? storedDensity : 'comfortable');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.setAttribute('data-theme', resolveMode(mode));
      root.setAttribute('data-nx-theme', theme);
      root.setAttribute('data-density', density);
    };
    apply();
    if (mode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [mode, theme, density]);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    theme,
    density,
    setMode: (next) => { setModeState(next); window.localStorage.setItem(MODE_KEY, next); },
    setTheme: (next) => { setThemeState(next); window.localStorage.setItem(THEME_KEY, next); },
    setDensity: (next) => { setDensityState(next); window.localStorage.setItem(DENSITY_KEY, next); },
  }), [mode, theme, density]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
