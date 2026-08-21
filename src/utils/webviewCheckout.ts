import { safeSessionGet, safeSessionRemove, safeSessionSet } from './safeStorage';
import { isLikelyInAppWebView } from './webviewDownload';

const PENDING_CHECKOUT_KEY = 'mv_pending_checkout';

export type PendingCheckout = {
  orderCode: string;
  kind: 'plan' | 'addon' | 'invoice';
  at: number;
};

export function rememberPendingCheckout(
  orderCode: string | null | undefined,
  kind: PendingCheckout['kind'],
): void {
  if (!orderCode) return;
  safeSessionSet(
    PENDING_CHECKOUT_KEY,
    JSON.stringify({
      orderCode,
      kind,
      at: Date.now(),
    } satisfies PendingCheckout),
  );
}

export function readPendingCheckout(maxAgeMs = 1000 * 60 * 45): PendingCheckout | null {
  const raw = safeSessionGet(PENDING_CHECKOUT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingCheckout;
    if (!parsed?.orderCode || !parsed?.at) return null;
    if (Date.now() - parsed.at > maxAgeMs) {
      clearPendingCheckout();
      return null;
    }
    return parsed;
  } catch {
    clearPendingCheckout();
    return null;
  }
}

export function clearPendingCheckout(): void {
  safeSessionRemove(PENDING_CHECKOUT_KEY);
}

/** Ask native WebView hosts to open checkout if they support it; otherwise false. */
export function notifyNativeOpenCheckout(url: string, orderCode?: string | null): boolean {
  const w = window as Window & {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    AndroidBridge?: { openCheckout?: (url: string) => void };
  };

  const payload = JSON.stringify({
    type: 'open_checkout',
    url,
    orderCode: orderCode || null,
  });

  if (w.AndroidBridge?.openCheckout) {
    w.AndroidBridge.openCheckout(url);
    return true;
  }

  if (w.ReactNativeWebView?.postMessage) {
    w.ReactNativeWebView.postMessage(payload);
    // Still navigate in WebView as fallback — native can ignore/cancel if it opens externally.
    return false;
  }

  return false;
}

export function navigateToCheckout(
  url: string,
  orderCode?: string | null,
  kind: PendingCheckout['kind'] = 'addon',
): void {
  rememberPendingCheckout(orderCode, kind);
  notifyNativeOpenCheckout(url, orderCode);
  window.location.assign(url);
}

export function notifyNativeForceLogout(reason: string = 'subscription_updated'): void {
  const w = window as Window & {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    AndroidBridge?: { forceLogout?: (reason: string) => void };
  };

  const payload = JSON.stringify({
    type: 'force_logout',
    reason,
  });

  try {
    if (w.AndroidBridge?.forceLogout) {
      w.AndroidBridge.forceLogout(reason);
    }
  } catch {
    /* ignore */
  }

  try {
    if (w.ReactNativeWebView?.postMessage) {
      w.ReactNativeWebView.postMessage(payload);
    }
  } catch {
    /* ignore */
  }
}
