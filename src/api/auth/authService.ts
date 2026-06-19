import type { LoginPayload, LoginResponse, LogoutResponse, MeResponse, ShipperUser } from './types';

export const AUTH_TOKEN_KEY = 'shipper_auth_token';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const bearer = token ?? getStoredToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload: T & { message?: string } | null = null;
  try {
    payload = (await response.json()) as T & { message?: string };
  } catch {
    throw new Error(response.statusText || 'Request failed');
  }

  if (!response.ok) {
    const errPayload = payload as { message?: string; errors?: Record<string, string[]> };
    const firstFieldError = errPayload.errors
      ? Object.values(errPayload.errors).flat()[0]
      : undefined;
    const message = firstFieldError || errPayload.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export const authService = {
  async login(payload: LoginPayload): Promise<{ token: string; user: ShipperUser }> {
    const res = await authRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, null);

    if (!res.status || !res.bearer_token) {
      throw new Error(res.message || 'Login failed');
    }

    return { token: res.bearer_token, user: res.data };
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
