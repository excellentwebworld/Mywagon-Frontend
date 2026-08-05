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

  async me(): Promise<ShipperUser> {
    const res = await authRequest<MeResponse>('/auth/me');
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await authRequest<LogoutResponse>('/auth/logout', { method: 'POST' });
    } finally {
      clearStoredToken();
    }
  },
};

export type { TwoFactorChallenge };
