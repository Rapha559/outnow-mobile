import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest } from '@/lib/api';

const SESSION_KEY = 'outnow_user_session';

type OutNowUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'CUSTOMER' | 'PROMOTER';
};

type AuthContextValue = {
  user: OutNowUser | null;
  sessionToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  saveSession: (token: string, user: OutNowUser) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OutNowUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(SESSION_KEY);
        if (!token) return;

        const data = await apiRequest<{ authenticated: boolean; user: OutNowUser }>(
          '/api/mobile/auth/me',
          {},
          token,
        );

        if (!active) return;
        setSessionToken(token);
        setUser(data.user);
      } catch {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function saveSession(token: string, nextUser: OutNowUser) {
    await SecureStore.setItemAsync(SESSION_KEY, token);
    setSessionToken(token);
    setUser(nextUser);
  }

  async function refreshUser() {
    if (!sessionToken) return;
    const data = await apiRequest<{ authenticated: boolean; user: OutNowUser }>(
      '/api/mobile/auth/me',
      {},
      sessionToken,
    );
    setUser(data.user);
  }

  async function signOut() {
    const token = sessionToken;
    setSessionToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);

    if (token) {
      try {
        await apiRequest('/api/mobile/auth/logout', { method: 'POST' }, token);
      } catch {
        // Local sign-out should still succeed if the network is unavailable.
      }
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionToken,
      loading,
      isAuthenticated: Boolean(user && sessionToken),
      saveSession,
      refreshUser,
      signOut,
    }),
    [user, sessionToken, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
