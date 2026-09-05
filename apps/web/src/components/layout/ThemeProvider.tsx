'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);
const STORAGE_KEY = 'nexor-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const frame = window.requestAnimationFrame(() => setThemeState(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
