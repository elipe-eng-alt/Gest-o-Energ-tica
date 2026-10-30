import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { CompanyData } from '../types';

/** Dados da empresa logada. Cada alteração devolve os dados completos já atualizados. */
export function useCompanyData(userId: number | null) {
  const [data, setData] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    if (userId === null) return;

    let cancelled = false;
    api<CompanyData>('/api/company/data')
      .then((result) => !cancelled && setData(result))
      .catch((reason) => !cancelled && setError(errorMessage(reason)));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const mutate = useCallback(async (method: string, path: string, body?: unknown) => {
    const result = await api<CompanyData>(`/api/company${path}`, { method, body });
    setData(result);
    return result;
  }, []);

  return { data, error, mutate };
}
