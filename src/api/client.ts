import axios from 'axios';
import type { ApiResponse } from './types/addressBook';
import { getBrowserTimezone } from '../utils/timezone';

export const AUTH_TOKEN_KEY = 'shipper_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/shipper/v1';

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Client-Timezone'] = getBrowserTimezone();
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('shipper:unauthorized'));
    }
    if (error.response?.status === 403 && error.response?.data?.code === 'past_due') {
      window.dispatchEvent(new CustomEvent('shipper:past-due'));
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const billingPath = `${base}/billing`;
      if (!window.location.pathname.replace(/\/$/, '').endsWith('/billing')) {
        window.location.assign(billingPath);
      }
    }
    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  data?: unknown;
  /** Present on some subscription 403 bodies (e.g. availabilities). */
  upgradeUrl?: string;

  constructor(
    message: string,
    status: number,
    fieldErrors?: Record<string, string[]>,
    data?: unknown,
    upgradeUrl?: string
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.data = data;
    this.upgradeUrl = upgradeUrl;
  }
}

function extractUpgradeUrl(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const url = (body as { upgrade_url?: unknown }).upgrade_url;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | string[]>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(`${key}[]`, v));
    } else if (typeof value === 'boolean') {
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
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await axiosInstance({
      url: path,
      method: options.method || 'GET',
      data: options.body,
      headers: options.headers,
    });

    const data = response.data as ApiResponse<T> & { status?: boolean; upgrade_url?: string };
    if (data && typeof data === 'object') {
      if (data.success === false) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          (data as { errors?: Record<string, string[]> }).errors,
          data.data,
          extractUpgradeUrl(data)
        );
      }
      // Laravel global Handler returns some 404s as HTTP 200 with status:false.
      if (data.status === false) {
        throw new ApiError(data.message || 'Request failed', 404, undefined, data.data);
      }
    }

    return data;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (axios.isAxiosError(err)) {
      const status = err.response?.status || 500;
      const data = err.response?.data;
      const message = data?.message || err.message;
      const fieldErrors = data?.errors as Record<string, string[]> | undefined;
      throw new ApiError(message, status, fieldErrors, data?.data, extractUpgradeUrl(data));
    }
    throw err;
  }
}

export function apiGet<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): Promise<ApiResponse<T>> {
  return apiRequest<T>(`${path}${query ? buildQuery(query) : ''}`);
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'POST',
    body,
  });
}

export function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'PUT',
    body,
  });
}

export function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: 'DELETE' });
}

function parseFilenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  if (!match?.[1]) return fallback;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ''));
  } catch {
    return match[1];
  }
}

export async function apiDownload(
  path: string,
  fallbackFilename: string,
  query?: Record<string, string | number | boolean | undefined | string[]>,
): Promise<{ filename: string; truncated: boolean }> {
  const qs = query ? buildQuery(query) : '';
  try {
    const response = await axiosInstance.get(`${path}${qs}`, {
      responseType: 'blob',
      headers: {
        Accept:
          'application/octet-stream, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
      },
    });
    const blob = response.data as Blob;

    if (blob.type.includes('application/json') || blob.type.includes('text/json')) {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { message?: string; success?: boolean };
      if (parsed.success === false || response.status >= 400) {
        throw new ApiError(parsed.message || 'Download failed', response.status);
      }
    }
    const filename = parseFilenameFromDisposition(
      response.headers['content-disposition'],
      fallbackFilename,
    );
    const truncated = response.headers['x-audit-export-truncated'] === 'true';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { filename, truncated };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text) as { message?: string };
        throw new ApiError(parsed.message || 'Download failed', err.response.status);
      } catch {
        throw new ApiError('Download failed', err.response?.status || 500);
      }
    }
    if (err instanceof ApiError) throw err;
    throw err;
  }
}
