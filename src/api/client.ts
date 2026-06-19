import type { ApiResponse } from './types/addressBook';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1/address-book';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (typeof value === 'boolean') {
      search.set(key, value ? '1' : '0');
    } else {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-XSRF-TOKEN'] = csrf;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiError(response.statusText || 'Request failed', response.status);
    }
    throw new ApiError('Invalid response from server', response.status);
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(payload?.message || response.statusText || 'Request failed', response.status);
  }

  return payload;
}

export function apiGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
  return apiRequest<T>(`${path}${query ? buildQuery(query) : ''}`);
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: 'DELETE' });
}
