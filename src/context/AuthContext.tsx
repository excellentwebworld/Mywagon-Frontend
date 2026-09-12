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
import { clearInfoFormReminderSkip } from '../components/layout/InfoFormReminderModal';

interface AuthContextValue {
  user: ShipperUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginError: string | null;
  /** Returns a 2FA challenge when required; otherwise authenticates and returns the user. */
  login: (email: string, password: string) => Promise<TwoFactorChallenge | ShipperUser>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<ShipperUser>;
  resendTwoFactorEmail: (challengeToken: string) => Promise<{ masked_email?: string }>;
  sendTwoFactorRecoveryEmail: (challengeToken: string) => Promise<{ masked_email?: string }>;
  verifyTwoFactorRecovery: (challengeToken: string, code: string) => Promise<{ two_factor_reset: boolean; user: ShipperUser }>;
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
  const userRef = React.useRef<ShipperUser | null>(null);
  userRef.current = user;

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

  // Keep KYC / company-info gates in sync when admin accepts/rejects while the SPA is open.
  useEffect(() => {
    if (!token) return;

    const isKycRelated = (detail: unknown): boolean => {
      if (!detail || typeof detail !== 'object') return false;
      const d = detail as Record<string, unknown>;
      const hay = [d.type, d.redirect_slug, d.title, d.body]
        .map((v) => String(v ?? '').toLowerCase())
        .join(' ');
      return (
        hay.includes('kyc') ||
        hay.includes('compliance') ||
        hay.includes('verification') ||
        hay.includes('profile')
      );
    };

    const onNotification = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (isKycRelated(detail)) {
        void refreshUser().catch(() => {});
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const status = userRef.current?.kyc_status;
      // Re-fetch when returning to the tab if still KYC-gated (admin may have accepted).
      if (status === 'pending' || status === 'rejected') {
        void refreshUser().catch(() => {});
      }
    };

    window.addEventListener('shipper:notification-received', onNotification);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('shipper:notification-received', onNotification);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<TwoFactorChallenge | ShipperUser> => {
    setLoginError(null);
    try {
      const result = await authService.login({ email, password });
      if (result.kind === 'two_factor') {
        return result.challenge;
      }
      // Laravel LoginController forgets info_form_reminder_shown on fresh login.
      clearInfoFormReminderSkip(result.user?.id);
      setStoredToken(result.token);
      setToken(result.token);
      setUser(result.user);
      return result.user;
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
      clearInfoFormReminderSkip(profile?.id);
      setStoredToken(bearerToken);
      setToken(bearerToken);
      setUser(profile);
      return profile;
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
      clearInfoFormReminderSkip(profile?.id);
      setStoredToken(bearerToken);
      setToken(bearerToken);
      setUser(profile);
      return { two_factor_reset, user: profile };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Recovery verification failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    const previousUserId = user?.id ?? null;
    try {
      await authService.logout();
    } catch {
      clearStoredToken();
    } finally {
      clearInfoFormReminderSkip(previousUserId);
      await unregisterFcmDevice().catch(() => {});
      setUser(null);
      setToken(null);
    }
  }, [user?.id]);

  useEffect(() => {
    const onForceLogout = () => {
      clearStoredToken();
      void cleanupLocalFcmDevice().finally(() => {
        setUser(null);
        setToken(null);
        const path = window.location.pathname || '';
        const isPublicGuestPath =
          path === '/login' ||
          path.startsWith('/track-shipment') ||
          path.startsWith('/webview/') ||
          path.startsWith('/shipper/register') ||
          path.startsWith('/auth/social') ||
          path.startsWith('/complete-signup') ||
          path.startsWith('/terms-condition') ||
          path.startsWith('/privacy-policy');
        if (!isPublicGuestPath) {
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
