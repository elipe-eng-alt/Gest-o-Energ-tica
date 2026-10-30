import { useCallback, useEffect, useState } from 'react';
import { UNAUTHORIZED_EVENT, api } from '../lib/api';
import type { User } from '../types';

type AuthState = { status: 'loading' | 'guest' | 'user'; user: User | null };

const GUEST: AuthState = { status: 'guest', user: null };

export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  useEffect(() => {
    api<{ user: User | null }>('/api/auth/me')
      .then(({ user }) => setState(user ? { status: 'user', user } : GUEST))
      .catch(() => setState(GUEST));

    // Sessão expirada durante o uso: volta para o modo visitante.
    const onUnauthorized = () => setState(GUEST);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const signIn = useCallback((user: User) => setState({ status: 'user', user }), []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const { user } = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: { email, senha } });
      signIn(user);
      return user;
    },
    [signIn],
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      setState(GUEST);
    }
  }, []);

  return { ...state, signIn, login, logout };
}
