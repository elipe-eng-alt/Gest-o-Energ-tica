import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'energia-viva-theme';
const THEME_COLORS: Record<Theme, string> = { light: '#f5f7f4', dark: '#0e1513' };

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

/** Tema atual, já aplicado em index.html antes do React para evitar flash de tema errado. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Sem storage: o tema vale só para esta visita.
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
