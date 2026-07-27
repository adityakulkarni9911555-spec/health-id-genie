import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'medora-theme';

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'system';
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return mode;
}

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  // Emergency route is always forced light for clinician clarity/print
  if (window.location.pathname.startsWith('/e/')) {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = 'light';
    return;
  }
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(getStoredTheme()));

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setModeState(next);
    applyTheme(next);
    setResolved(resolveTheme(next));
  }, []);

  // React to OS-level changes when in system mode, and to changes made in
  // other tabs.
  useEffect(() => {
    applyTheme(mode);
    setResolved(resolveTheme(mode));

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
        setResolved(resolveTheme('system'));
      }
    };
    mql.addEventListener?.('change', onSystem);

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const v = getStoredTheme();
        setModeState(v);
        applyTheme(v);
        setResolved(resolveTheme(v));
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      mql.removeEventListener?.('change', onSystem);
      window.removeEventListener('storage', onStorage);
    };
  }, [mode]);

  return { mode, resolved, setMode };
}
