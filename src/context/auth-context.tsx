import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { ApiRequestError, apiRequest, setUnauthorizedHandler } from '@/lib/api';
import { registerRemotePush, unregisterRemotePush } from '@/lib/push-notifications';

const SESSION_KEY = 'outnow_user_session';
const USER_KEY = 'outnow_cached_user';

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

async function cacheUser(user: OutNowUser | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function readCachedUser(): Promise<OutNowUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as OutNowUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<OutNowUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function clearLocalSession() {
    setSessionToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(SESSION_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearLocalSession();
      router.replace('/login');
      Alert.alert('Session ended', 'Your session has ended. Please sign in again.');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = await SecureStore.getItemAsync(SESSION_KEY);
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await apiRequest<{ authenticated: boolean; user: OutNowUser }>(
          '/api/mobile/auth/me',
          {},
          token,
        );

        if (!active) return;
        setSessionToken(token);
        setUser(data.user);
        await cacheUser(data.user);
        void registerRemotePush(token).catch(() => undefined);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          if (active) {
            await clearLocalSession();
          }
          return;
        }

        const cachedUser = await readCachedUser();
        if (!active) return;
        if (cachedUser) {
          // Keep the local session available so previously saved tickets and QR codes
          // remain accessible when the device has no connection. Server-protected
          // actions will still fail safely until connectivity returns.
          setSessionToken(token);
          setUser(cachedUser);
        } else {
          await SecureStore.deleteItemAsync(SESSION_KEY);
        }
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
    await cacheUser(nextUser);
    setSessionToken(token);
    setUser(nextUser);
    void registerRemotePush(token).catch(() => undefined);
  }

  async function refreshUser() {
    if (!sessionToken) return;
    const data = await apiRequest<{ authenticated: boolean; user: OutNowUser }>(
      '/api/mobile/auth/me',
      {},
      sessionToken,
    );
    setUser(data.user);
    await cacheUser(data.user);
  }

  async function signOut() {
    const token = sessionToken;
    await clearLocalSession();

    if (token) {
      try {
        await unregisterRemotePush(token);
      } catch {
        // Remote push cleanup must never block local sign-out.
      }
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
