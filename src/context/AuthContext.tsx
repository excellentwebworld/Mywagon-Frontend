import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authService,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  type ShipperUser,
} from '../api/auth';

interface AuthContextValue {
  user: ShipperUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ShipperUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const stored = getStoredToken();
    if (!stored) {
      setUser(null);
      setToken(null);
      return;
    }

    const profile = await authService.me();
    setUser(profile);
    setToken(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (getStoredToken()) {
          await Promise.race([
            refreshUser(),
            new Promise<never>((_, reject) => {
              window.setTimeout(() => reject(new Error('Session check timed out')), 15000);
            }),
          ]);
        }
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    const onUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('shipper:unauthorized', onUnauthorized);

    return () => {
      cancelled = true;
      window.removeEventListener('shipper:unauthorized', onUnauthorized);
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setLoginError(null);
    try {
      const { token: bearerToken, user: profile } = await authService.login({ email, password });
      setStoredToken(bearerToken);
      setToken(bearerToken);
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      clearStoredToken();
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      loginError,
      login,
      logout,
      refreshUser,
      clearLoginError,
    }),
    [user, token, isLoading, loginError, login, logout, refreshUser, clearLoginError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
