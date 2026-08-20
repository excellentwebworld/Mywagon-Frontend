import axios from 'axios';
import { getBrowserTimezone } from '../utils/timezone';

export type WebViewRole = 'carrier' | 'driver';

const SESSION_KEY: Record<WebViewRole, string> = {
  carrier: 'webview_carrier_user_id',
  driver: 'webview_driver_user_id',
};

export function getStoredWebViewUserId(role: WebViewRole): string | null {
  return sessionStorage.getItem(SESSION_KEY[role]);
}

export function setStoredWebViewUserId(role: WebViewRole, userId: string): void {
  sessionStorage.setItem(SESSION_KEY[role], userId);
}

export function createWebViewApi(role: WebViewRole, userId: string) {
  const instance = axios.create({
    baseURL: `/api/${role}`,
    headers: { Accept: 'application/json' },
  });

  instance.interceptors.request.use((config) => {
    config.headers['X-Client-Timezone'] = getBrowserTimezone();
    config.headers['X-WebView-User-Id'] = userId;
    if (config.method === 'get' || config.method === 'delete') {
      config.params = { ...config.params, user_id: userId };
    }
    return config;
  });

  return instance;
}
