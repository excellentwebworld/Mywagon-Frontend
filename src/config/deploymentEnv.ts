/**
 * MS3-356 / MS3-352 / BUG-03 — keep a production page off staging API, socket, and chat gateway.
 *
 * Vite bakes VITE_* at build time. A production host (www.myvagon.ai) that was
 * built with `--mode staging` still calls staging.myvagon.com. When the page
 * itself is production, those staging hosts are rewritten to the production
 * Laravel origin declared in `.env.production` (https://myvagon.com).
 * Staging and local pages are left alone.
 */

// myvagon.ai / www.myvagon.ai are NOT listed: both are custom domains on the
// Amplify staging branch, and https://myvagon.com is the WordPress marketing
// site with no Laravel API behind it. Rewriting them sent login to a 404 with
// no CORS headers ("Network Error"). Add them back once a production API exists.
export const PRODUCTION_PAGE_HOSTS = new Set([
  'myvagon.com',
  'www.myvagon.com',
]);

/** Matches `.env.production` VITE_LARAVEL_URL. Not a secret. */
export const PRODUCTION_API_ORIGIN = 'https://myvagon.com';

/**
 * Host baked by `.env.staging` VITE_CHAT_GATEWAY_URL. That gateway talks to
 * staging Laravel. Production has no gateway yet (`.env.production` leaves
 * the var empty). A staging-built bundle opened on www.myvagon.ai must not
 * call this host.
 */
export const STAGING_CHAT_GATEWAY_HOST = '98-82-195-67.sslip.io';

export function isProductionPageHost(hostname: string): boolean {
  return PRODUCTION_PAGE_HOSTS.has(hostname.trim().toLowerCase());
}

export function pageHostname(): string {
  if (typeof window === 'undefined' || !window.location) return '';
  return window.location.hostname || '';
}

/** Rewrite a staging absolute URL when the open page is production. */
export function alignUrlToPage(url: string, pageHost: string = pageHostname()): string {
  const raw = (url || '').trim();
  if (!raw || !isProductionPageHost(pageHost)) return raw;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }
  if (!/^staging\.myvagon\.com$/i.test(parsed.hostname)) return raw;
  const prod = new URL(PRODUCTION_API_ORIGIN);
  const path = parsed.pathname === "/" ? "" : parsed.pathname;
  return `${prod.origin}${path}${parsed.search}${parsed.hash}`;
}

/**
 * On a production page, drop the staging chat gateway (sslip.io or
 * staging.myvagon.com). Any other absolute gateway URL is kept so a future
 * production gateway still works. Staging and local pages are unchanged.
 * Empty string means "no gateway" — callers throw the same error as an unset var.
 */
export function alignChatGatewayToPage(url: string, pageHost: string = pageHostname()): string {
  const raw = (url || '').trim();
  if (!raw || !isProductionPageHost(pageHost)) return raw;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return '';
  }
  const host = parsed.hostname.toLowerCase();
  if (host === STAGING_CHAT_GATEWAY_HOST || host === 'staging.myvagon.com') return '';
  return raw;
}

export function chatGatewayConfiguredUrl(pageHost: string = pageHostname()): string {
  const raw = ((import.meta.env.VITE_CHAT_GATEWAY_URL as string | undefined) || '').trim();
  return alignChatGatewayToPage(raw, pageHost);
}

export function apiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/shipper/v1';
  return alignUrlToPage(raw);
}

export function laravelOrigin(): string {
  const raw = ((import.meta.env.VITE_LARAVEL_URL as string | undefined) || '').replace(/\/$/, '');
  if (!raw) {
    const base = apiBaseUrl();
    if (base.startsWith('http')) {
      try {
        return new URL(base).origin;
      } catch {
        return '';
      }
    }
    return '';
  }
  return alignUrlToPage(raw).replace(/\/$/, '');
}

/** VITE_SOCKET_URL only — empty when unset (public tracking stays disabled). */
export function explicitSocketUrl(): string {
  const raw = ((import.meta.env.VITE_SOCKET_URL as string | undefined) || '').trim().replace(/\/$/, '');
  return raw ? alignUrlToPage(raw).replace(/\/$/, '') : '';
}

/** Socket.IO base: explicit socket URL, else the Laravel origin. */
export function socketUrl(): string {
  return explicitSocketUrl() || laravelOrigin();
}

export function legacyApiRoot(): string {
  const url = (import.meta.env.VITE_API_URL as string | undefined) || '';
  const version = (import.meta.env.VITE_API_VERSION as string | undefined) || '';
  return alignUrlToPage(`${url}${version}`);
}