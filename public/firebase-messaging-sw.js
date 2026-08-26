/**
 * Firebase Cloud Messaging Service Worker — MYVAGON Shipper Panel
 *
 * Handles background push notifications when the app tab is closed or
 * the user is not actively using the panel.
 *
 * This file must live at the root of the served domain (/firebase-messaging-sw.js)
 * so that the service worker scope covers the entire app.
 *
 * Background notification click logic:
 *   - Opens the shipper panel if no tab is currently open
 *   - Focuses an existing tab if one is already open
 *   - Navigates to /notifications (or a specific route based on payload)
 */

// ── Import Firebase compat scripts from CDN ──────────────────────────────
// Using compat v9 CDN scripts is the standard approach for FCM service workers.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Initialize Firebase ───────────────────────────────────────────────────
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || 'AIzaSyBY-2LBJ4O2MvbibFCxoucsBWcPedYG_FE',
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || 'myvagon-67ba6.firebaseapp.com',
  projectId:         self.FIREBASE_PROJECT_ID         || 'myvagon-67ba6',
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || 'myvagon-67ba6.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '33096830005',
  appId:             self.FIREBASE_APP_ID             || '1:33096830005:web:8f7730cf2f3648a337b57c',
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title
    ?? payload.data?.title
    ?? 'MYVAGON Notification';

  const body = payload.notification?.body
    ?? payload.data?.body
    ?? '';

  const notificationOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'myvagon-notification',        // collapses duplicates
    renotify: true,
    data: {
      type:     payload.data?.type      ?? '',
      type_id:  payload.data?.type_id   ?? '',
      url:      payload.data?.click_url ?? '/notifications',
    },
  };

  self.registration.showNotification(title, notificationOptions);
});

// ── Notification click handler ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data       = event.notification.data ?? {};
  const targetUrl  = data.url || '/notifications';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an already-open shipper panel tab
        for (const client of clientList) {
          try {
            const url = new URL(client.url);
            if (url.pathname.startsWith('/')) {
              client.focus();
              if ('navigate' in client) {
                return client.navigate(targetUrl);
              }
              return;
            }
          } catch {
            /* ignore malformed URLs */
          }
        }
        // No existing tab — open a new one
        return clients.openWindow(targetUrl);
      })
  );
});
