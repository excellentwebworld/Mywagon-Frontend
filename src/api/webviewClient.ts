import axios from 'axios';
import i18n from '../utils/i18n';
import { getBrowserTimezone } from '../utils/timezone';
import { safeSessionGet, safeSessionSet } from '../utils/safeStorage';

export type WebViewRole = 'carrier' | 'driver';

const SESSION_KEY: Record<WebViewRole, string> = {
  carrier: 'webview_carrier_user_id',
  driver: 'webview_driver_user_id',
};

export function getStoredWebViewUserId(role: WebViewRole): string | null {
  return safeSessionGet(SESSION_KEY[role]);
}

export function setStoredWebViewUserId(role: WebViewRole, userId: string): void {
  safeSessionSet(SESSION_KEY[role], userId);
}

function laravelOrigin(): string {
  const fromLaravel = (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '');
  if (fromLaravel) return fromLaravel;

  const shipperBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (shipperBase?.startsWith('http')) {
    try {
      return new URL(shipperBase).origin;
    } catch {
      // ignore malformed env
    }
  }

  return '';
}

export function createWebViewApi(role: WebViewRole, userId: string) {
  const origin = laravelOrigin();
  const instance = axios.create({
    baseURL: origin ? `${origin}/api/${role}` : `/api/${role}`,
    headers: { Accept: 'application/json' },
    timeout: 25000,
  });

  instance.interceptors.request.use((config) => {
    // Query/body user_id only — extra headers force a CORS preflight that many
    // in-app WebViews never complete, so the page stays on a loader forever.
    const lang = (i18n.language || 'en').startsWith('el') ? 'el' : 'en';
    config.params = {
      ...config.params,
      user_id: userId,
      timezone: getBrowserTimezone(),
      lang,
    };
    if (config.method !== 'get' && config.method !== 'delete') {
      const data = config.data;
      if (data && typeof data === 'object' && !(data instanceof FormData)) {
        config.data = { ...data, user_id: userId };
      }
    }
    return config;
  });

  return instance;
}
