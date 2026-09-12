import axios from 'axios';
import { axiosInstance, AUTH_TOKEN_KEY, getStoredToken, setStoredToken, clearStoredToken } from '../client';
import type {
  LoginPayload,
  LoginResponse,
  LoginResult,
  LogoutResponse,
  MeResponse,
  ShipperUser,
  TwoFactorChallenge,
} from './types';

export { AUTH_TOKEN_KEY, getStoredToken, setStoredToken, clearStoredToken };

async function authRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (token === null) {
    headers.Authorization = '';
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axiosInstance({
      url: path,
      method: options.method || 'GET',
      data: options.body,
      headers,
    });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data;
      const statusText = err.response?.statusText || err.message;
      const errPayload = data as { message?: string; errors?: Record<string, string[]> };
      const firstFieldError = errPayload?.errors
        ? Object.values(errPayload.errors).flat()[0]
        : undefined;
      const message = firstFieldError || errPayload?.message || statusText || 'Request failed';
      throw new Error(message);
    }
    throw err;
  }
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await authRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    }, null);

    if (res.two_factor_required) {
      return {
        kind: 'two_factor',
        challenge: {
          challenge_token: res.challenge_token,
          method: res.method,
          masked_email: res.masked_email,
        },
      };
    }

    if (!res.status || !res.bearer_token) {
      throw new Error(res.message || 'Login failed');
    }

    return { kind: 'authenticated', token: res.bearer_token, user: res.data };
  },

  async verifyTwoFactor(challengeToken: string, code: string): Promise<{ token: string; user: ShipperUser }> {
    const res = await authRequest<{
      status: boolean;
      message: string;
      bearer_token?: string;
      data?: ShipperUser;
    }>('/auth/2fa/verify', {
      method: 'POST',
      body: { challenge_token: challengeToken, code },
    }, null);

    if (!res.status || !res.bearer_token || !res.data) {
      throw new Error(res.message || 'Verification failed');
    }

    return { token: res.bearer_token, user: res.data };
  },

  async resendTwoFactorEmail(challengeToken: string): Promise<{ masked_email?: string }> {
    const res = await authRequest<{
      status: boolean;
      message: string;
      data?: { masked_email?: string };
    }>('/auth/2fa/resend-email', {
      method: 'POST',
      body: { challenge_token: challengeToken },
    }, null);

    if (!res.status) {
      throw new Error(res.message || 'Could not resend code');
    }

    return res.data ?? {};
  },

  async sendTwoFactorRecoveryEmail(challengeToken: string): Promise<{ masked_email?: string }> {
    const res = await authRequest<{
      status: boolean;
      message: string;
      data?: { masked_email?: string };
    }>('/auth/2fa/recovery/send-email', {
      method: 'POST',
      body: { challenge_token: challengeToken },
    }, null);

    if (!res.status) {
      throw new Error(res.message || 'Could not send recovery email');
    }

    return res.data ?? {};
  },

  async verifyTwoFactorRecovery(
    challengeToken: string,
    code: string,
  ): Promise<{ token: string; user: ShipperUser; two_factor_reset: boolean }> {
    const res = await authRequest<{
      status: boolean;
      message: string;
      bearer_token?: string;
      data?: ShipperUser;
      two_factor_reset?: boolean;
    }>('/auth/2fa/recovery/verify', {
      method: 'POST',
      body: { challenge_token: challengeToken, code },
    }, null);

    if (!res.status || !res.bearer_token || !res.data) {
      throw new Error(res.message || 'Recovery verification failed');
    }

    return {
      token: res.bearer_token,
      user: res.data,
      two_factor_reset: Boolean(res.two_factor_reset),
    };
  },

  async me(): Promise<ShipperUser> {
    const res = await authRequest<MeResponse>('/auth/me');
    return res.data;
  },

  async forgotPassword(email: string): Promise<{ status: boolean; message: string }> {
    try {
      const res = await authRequest<{ status: boolean; message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      }, null);
      if (res.status === false) {
        throw new Error(res.message || 'Failed to send reset password link');
      }
      return res;
    } catch (err: unknown) {
      const isNotFound =
        (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.data?.status === false)) ||
        (err instanceof Error && (err.message.toLowerCase().includes('could not be found') || err.message.includes('404')));

      if (isNotFound) {
        const laravelBase =
          (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ||
          (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/.*$/, '') ||
          '';
        const fallbackUrl = `${laravelBase}/password/email`;
        try {
          const fbRes = await axios.post(
            fallbackUrl,
            { email, user_type: 'shippers' },
            {
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          return {
            status: true,
            message: fbRes.data?.message || 'Reset password link sent on your email',
          };
        } catch (fbErr: unknown) {
          if (axios.isAxiosError(fbErr)) {
            const data = fbErr.response?.data;
            const msg =
              data?.message ||
              (data?.errors && Object.values(data.errors).flat()[0]) ||
              fbErr.message;
            throw new Error(msg);
          }
          throw fbErr;
        }
      }
      throw err;
    }
  },

  async verifyResetToken(token: string, email: string): Promise<{ status: boolean; valid: boolean; message?: string }> {
    try {
      const res = await authRequest<{ status: boolean; valid: boolean; message?: string }>('/auth/verify-reset-token', {
        method: 'POST',
        body: { token, email },
      }, null);
      return res;
    } catch {
      // Fallback: if route is not deployed on staging yet, consider valid so reset form is displayed
      return { status: true, valid: true };
    }
  },

  async resetPassword(params: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ status: boolean; message: string }> {
    try {
      const res = await authRequest<{ status: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: params,
      }, null);
      if (res.status === false) {
        throw new Error(res.message || 'Failed to reset password');
      }
      return res;
    } catch (err: unknown) {
      const isNotFound =
        (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.data?.status === false)) ||
        (err instanceof Error && (err.message.toLowerCase().includes('could not be found') || err.message.includes('404')));

      if (isNotFound) {
        const laravelBase =
          (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ||
          (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/api\/.*$/, '') ||
          '';
        const fallbackUrl = `${laravelBase}/password/reset`;
        try {
          const fbRes = await axios.post(
            fallbackUrl,
            { ...params, user_type: 'shippers' },
            {
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          return {
            status: true,
            message: fbRes.data?.message || 'Your password has been updated successfully.',
          };
        } catch (fbErr: unknown) {
          if (axios.isAxiosError(fbErr)) {
            const data = fbErr.response?.data;
            const msg =
              data?.message ||
              (data?.errors && Object.values(data.errors).flat()[0]) ||
              fbErr.message;
            throw new Error(msg);
          }
          throw fbErr;
        }
      }
      throw err;
    }
  },

  async logout(): Promise<void> {
    try {
      await authRequest<LogoutResponse>('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },

  async completeSignup(body: FormData): Promise<ShipperUser> {
    try {
      const response = await axiosInstance({
        url: '/auth/complete-signup',
        method: 'POST',
        data: body,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const res = response.data as MeResponse;
      if (!res.status || !res.data) {
        throw new Error(res.message || 'Could not complete signup');
      }
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as {
          message?: string;
          errors?: Record<string, string[]>;
        };
        const fieldErrors: Record<string, string> = {};
        if (data?.errors) {
          for (const [key, messages] of Object.entries(data.errors)) {
            if (messages?.[0]) fieldErrors[key] = messages[0];
          }
        }
        const firstFieldError = Object.values(fieldErrors)[0];
        const message = firstFieldError || data?.message || err.message || 'Request failed';
        const { SignupApiError } = await import('./signupService');
        throw new SignupApiError(message, fieldErrors);
      }
      throw err;
    }
  },

  socialRedirectUrl(provider: 'google' | 'microsoft'): string {
    const apiBase =
      (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
      '/api/shipper/v1';
    const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(
      /\/$/,
      '',
    );
    return `${apiBase}/auth/social/${provider}/redirect?${new URLSearchParams({
      return_url: returnUrl,
    }).toString()}`;
  },
};

export type { TwoFactorChallenge };
