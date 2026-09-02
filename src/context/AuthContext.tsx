import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  authService,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  type ShipperUser,
  type TwoFactorChallenge,
} from '../api/auth';
import { cleanupLocalFcmDevice, unregisterFcmDevice } from '../hooks/useFcm';

interface AuthContextValue {
  user: ShipperUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  /** Returns a 2FA challenge when required; otherwise authenticates and returns null. */
  login: (email: string, password: string) => Promise<TwoFactorChallenge | null>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  resendTwoFactorEmail: (challengeToken: string) => Promise<{ masked_email?: string }>;
  sendTwoFactorRecoveryEmail: (challengeToken: string) => Promise<{ masked_email?: string }>;
  verifyTwoFactorRecovery: (challengeToken: string, code: string) => Promise<{ two_factor_reset: boolean }>;
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

    const onPastDue = () => {
      setUser((prev) => (prev && !prev.has_past_due ? { ...prev, has_past_due: true } : prev));
    };
    window.addEventListener('shipper:past-due', onPastDue);

    return () => {
      cancelled = true;
      window.removeEventListener('shipper:unauthorized', onUnauthorized);
      window.removeEventListener('shipper:past-due', onPastDue);
    };
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<TwoFactorChallenge | null> => {
    setLoginError(null);
    try {
      const result = await authService.login({ email, password });
      if (result.kind === 'two_factor') {
        return result.challenge;
      }
      setStoredToken(result.token);
      setToken(result.token);
      setUser(result.user);
      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const verifyTwoFactor = useCallback(async (challengeToken: string, code: string) => {
    setLoginError(null);
    try {
      const { token: bearerToken, user: profile } = await authService.verifyTwoFactor(challengeToken, code);
      setStoredToken(bearerToken);
      setToken(bearerToken);
      setUser(profile);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const resendTwoFactorEmail = useCallback(async (challengeToken: string) => {
    return authService.resendTwoFactorEmail(challengeToken);
  }, []);

  const sendTwoFactorRecoveryEmail = useCallback(async (challengeToken: string) => {
    return authService.sendTwoFactorRecoveryEmail(challengeToken);
  }, []);

  const verifyTwoFactorRecovery = useCallback(async (challengeToken: string, code: string) => {
    setLoginError(null);
    try {
      const { token: bearerToken, user: profile, two_factor_reset } =
        await authService.verifyTwoFactorRecovery(challengeToken, code);
      setStoredToken(bearerToken);
      setToken(bearerToken);
      setUser(profile);
      return { two_factor_reset };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recovery verification failed';
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
      await unregisterFcmDevice().catch(() => {});
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    const onForceLogout = () => {
      clearStoredToken();
      void cleanupLocalFcmDevice().finally(() => {
        setUser(null);
        setToken(null);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
    };

    window.addEventListener('shipper:force-logout', onForceLogout);
    return () => window.removeEventListener('shipper:force-logout', onForceLogout);
  }, [logout]);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      loginError,
      login,
      verifyTwoFactor,
      resendTwoFactorEmail,
      sendTwoFactorRecoveryEmail,
      verifyTwoFactorRecovery,
      logout,
      refreshUser,
      clearLoginError,
    }),
    [
      user,
      token,
      isLoading,
      loginError,
      login,
      verifyTwoFactor,
      resendTwoFactorEmail,
      sendTwoFactorRecoveryEmail,
      verifyTwoFactorRecovery,
      logout,
      refreshUser,
      clearLoginError,
    ]
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
