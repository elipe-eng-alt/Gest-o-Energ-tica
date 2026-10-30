import { useEffect, useState } from 'react';

/** useState que sincroniza com o localStorage, tolerando ambientes sem acesso ao storage. */
export function usePersistentState<T>(key: string, fallback: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed: unknown = JSON.parse(saved);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage indisponível (modo privado, cota cheia): mantém apenas em memória.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
