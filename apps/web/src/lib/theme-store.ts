import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/**
 * Resolve the effective theme (light or dark) for "system" mode.
 * Uses the current local hour: dark between 6 PM and 6 AM.
 */
export function resolveSystemTheme(): 'light' | 'dark' {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

/** Return the effective theme given a mode selection. */
export function getEffectiveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? resolveSystemTheme() : mode;
}

/** Apply the theme to the document root element. */
export function applyTheme(mode: ThemeMode) {
  const effective = getEffectiveTheme(mode);
  document.documentElement.setAttribute('data-theme', effective);
}

const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('focusflow-theme')
  : null) as ThemeMode | null;

export const useThemeStore = create<ThemeState>((set) => ({
  mode: stored ?? 'dark',
  setMode: (mode) => {
    localStorage.setItem('focusflow-theme', mode);
    applyTheme(mode);
    set({ mode });
  },
}));
