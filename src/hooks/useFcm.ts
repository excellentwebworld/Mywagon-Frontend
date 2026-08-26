/**
 * useFcm — Firebase Cloud Messaging hook for the MYVAGON Shipper Panel.
 *
 * Responsibilities:
 *   1. Request notification permission from the browser.
 *   2. Obtain an FCM registration token (VAPID-signed for web push).
 *   3. POST the token to `/auth/device-token` (idempotent — skipped if unchanged).
 *   4. Listen for foreground messages and surface them as toast notifications
 *      with a "View" action that navigates to /notifications.
 *   5. Watch for token refresh events and re-register the updated token.
 *
 * Gracefully no-ops when:
 *   - Firebase env vars are not configured (`isFirebaseConfigured === false`)
 *   - The browser blocks notification permission
 *   - The service worker cannot be registered
 *
 * Mount once per authenticated session — call inside `AppLayout` or `AppProvider`.
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingOrNull, vapidKey, isFirebaseConfigured } from '../config/firebase';
import { notificationService } from '../api/services/notificationService';

const SESSION_KEY = 'mv_fcm_token';

// ── In-Memory Deduplication Cache for Foreground Messages ─────────────────
const recentMessageSignatures = new Set<string>();

function isDuplicateMessage(key: string): boolean {
  if (!key) return false;
  if (recentMessageSignatures.has(key)) return true;
  recentMessageSignatures.add(key);
  setTimeout(() => recentMessageSignatures.delete(key), 8000);
  return false;
}

/**
 * Retrieve the previously registered token from sessionStorage so we skip
 * redundant API calls across soft re-mounts in the same browser tab session.
 */
function getCachedToken(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function setCachedToken(t: string): void {
  try { sessionStorage.setItem(SESSION_KEY, t); } catch { /* ignore */ }
}
function clearCachedToken(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export interface FcmNotificationPayload {
  title: string;
  body: string;
  type?: string;
  type_id?: string;
  action_id?: string;
  external_url?: string;
  redirect_slug?: string;
  created_at?: string;
}

interface UseFcmOptions {
  /** Called when a foreground FCM message arrives (for rich toast display). */
  onForegroundMessage?: (payload: FcmNotificationPayload) => void;
}

export function useFcm({ onForegroundMessage }: UseFcmOptions = {}): void {
  const navigate = useNavigate();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let cancelled = false;

    // ── 0. Listen for navigation messages from Service Worker ─────────
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FCM_NAVIGATE' && event.data.url) {
        navigate(event.data.url);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    async function init() {
      // ── 1. Service Worker registration ──────────────────────────────
      if (!('serviceWorker' in navigator)) return;

      let swRegistration: ServiceWorkerRegistration | undefined;
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
      } catch (err) {
        console.warn('[FCM] Service worker registration failed:', err);
        return;
      }

      if (cancelled) return;

      // ── 2. Notification permission ───────────────────────────────────
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        // User denied — clear any stale token
        clearCachedToken();
        await notificationService.updateDeviceToken(null).catch(() => {});
        return;
      }

      if (cancelled) return;

      // ── 3. FCM token retrieval ───────────────────────────────────────
      const messaging = getMessagingOrNull();
      if (!messaging) return;

      let token: string;
      try {
        token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swRegistration,
        });
      } catch (err) {
        console.warn('[FCM] getToken failed:', err);
        return;
      }

      if (cancelled) return;

      // ── 4. Register token with backend (deduplicated) ─────────────────
      if (token && token !== getCachedToken()) {
        try {
          await notificationService.updateDeviceToken(token);
          setCachedToken(token);
          console.log('[FCM] Device token registered with backend successfully.');
        } catch (err) {
          console.warn('[FCM] Device token registration failed:', err);
        }
      }

      if (cancelled) return;

      // ── 5. Foreground message listener ───────────────────────────────
      const unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? payload.data?.title ?? 'New Notification';
        const body  = payload.notification?.body  ?? payload.data?.body ?? payload.data?.notification_body ?? '';
        const type = payload.data?.type ?? '';
        const type_id = payload.data?.type_id ?? payload.data?.shipment_id ?? payload.data?.id ?? payload.data?.action_id ?? '';
        const action_id = payload.data?.action_id ?? type_id ?? '';
        const external_url = payload.data?.external_url ?? '';
        const redirect_slug = payload.data?.redirect_slug ?? '';

        // Deduplication check
        const msgKey = payload.messageId || `${title}_${body}_${type}_${type_id}`;
        if (isDuplicateMessage(msgKey)) {
          return;
        }

        const notifData: FcmNotificationPayload = {
          title,
          body,
          type,
          type_id,
          action_id,
          external_url,
          redirect_slug,
        };

        // Notify topbar / notifications page to refresh counters
        window.dispatchEvent(new CustomEvent('shipper:notification-received', { detail: notifData }));

        if (onForegroundMessage) {
          onForegroundMessage(notifData);
        } else if ('Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(title, { body, icon: '/favicon.ico' });
          n.onclick = () => {
            window.focus();
            navigate('/notifications');
          };
        }
      });

      unsubscribeRef.current = unsubscribe;
    }

    void init();

    return () => {
      cancelled = true;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once per mounted session

}
