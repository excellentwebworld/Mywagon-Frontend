import axios from 'axios';
import type { ApiResponse } from './types/addressBook';

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
    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  data?: unknown;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>, data?: unknown) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.data = data;
  }
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

    const data = response.data as ApiResponse<T> & { status?: boolean };
    if (data && typeof data === 'object') {
      if (data.success === false) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          (data as { errors?: Record<string, string[]> }).errors,
          data.data
        );
      }
      // Laravel global Handler returns some 404s as HTTP 200 with status:false.
      if (data.status === false) {
        throw new ApiError(data.message || 'Request failed', 404, undefined, data.data);
      }
    }

    return data;
  } catch (err: any) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status || 500;
      const data = err.response?.data;
      const message = data?.message || err.message;
      const fieldErrors = data?.errors as Record<string, string[]> | undefined;
      throw new ApiError(message, status, fieldErrors, data?.data);
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
