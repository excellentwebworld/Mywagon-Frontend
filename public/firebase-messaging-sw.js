/**
 * Firebase Cloud Messaging Service Worker — MYVAGON Shipper Panel
 *
 * Handles background push notifications when the app tab is closed or
 * the user is not actively using the panel.
 *
 * Capabilities:
 *   1. Intelligent Route Resolution: Navigates directly to shipment details, search trucks,
 *      partners, billing, settings, or external links on click.
 *   2. Deduplication Cache: Prevents duplicate notification popups if duplicate FCM
 *      delivery frames arrive in background.
 *   3. Tab Focus & Navigation: Reuses and focuses existing open tabs without reloading.
 */

// ── Import Firebase compat scripts from CDN ──────────────────────────────
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

// ── In-Memory Deduplication Cache ─────────────────────────────────────────
const seenMessageIds = new Set();

function isDuplicateMessage(msgId) {
  if (!msgId) return false;
  if (seenMessageIds.has(msgId)) return true;
  seenMessageIds.add(msgId);
  // Auto-expire after 60 seconds
  setTimeout(() => seenMessageIds.delete(msgId), 60000);
  return false;
}

// ── Route Resolver for Background Clicks ──────────────────────────────────
function resolveTargetUrl(data) {
  if (!data) return '/notifications';

  if (data.external_url) {
    return data.external_url;
  }

  if (data.redirect_slug) {
    const slug = data.redirect_slug;
    return slug.startsWith('/') ? slug : `/${slug}`;
  }

  const rawType = (data.type || '').toLowerCase();
  const id = data.type_id || data.action_id || data.shipment_id || '';
  const cleanId = id.replace(/^SID-|^ORD-|^INV-/, '');

  if (rawType.includes('dashboard') || rawType.includes('home')) {
    return '/dashboard';
  }
  if (rawType.includes('create_shipment')) {
    return '/shipments/create';
  }
  if (rawType.includes('manage_shipment') || rawType.includes('manage-shipment')) {
    return '/shipments';
  }
  if (rawType.includes('shipment') || rawType.includes('load') || rawType.includes('bid') || rawType.includes('cancel')) {
    return cleanId ? `/shipments/${cleanId}` : '/shipments';
  }
  if (rawType.includes('truck') || rawType.includes('availab')) {
    return '/search-trucks';
  }
  if (rawType.includes('partner')) {
    return '/partners';
  }
  if (rawType.includes('invoice') || rawType.includes('billing') || rawType.includes('payment') || rawType.includes('account_statement')) {
    return cleanId ? `/billing?invoice=${cleanId}` : '/billing';
  }
  if (rawType.includes('order')) {
    return cleanId ? `/erp-orders?id=${cleanId}` : '/erp-orders';
  }
  if (rawType.includes('subscription')) {
    return '/subscription';
  }
  if (rawType.includes('support') || rawType.includes('chat') || rawType.includes('feedback')) {
    return '/support';
  }
  if (rawType.includes('address')) {
    return '/address-book';
  }
  if (rawType.includes('product')) {
    return '/product-master';
  }
  if (rawType.includes('tutorial')) {
    return '/tutorials';
  }
  if (rawType.includes('user')) {
    return '/settings/users';
  }
  if (rawType.includes('company')) {
    return '/settings/organization';
  }
  if (rawType.includes('profile')) {
    return '/settings/personal';
  }
  if (rawType.includes('privacy')) {
    return '/settings/privacy';
  }
  if (rawType.includes('terms')) {
    return '/settings/terms';
  }

  return '/notifications';
}

// ── Background message handler ────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const msgId = payload.messageId || payload.data?.id || `${payload.data?.type || ''}_${payload.data?.type_id || ''}_${payload.data?.title || ''}`;

  if (isDuplicateMessage(msgId)) {
    return;
  }

  const rawType = (payload.data?.type || '').toLowerCase();
  if (rawType === 'logged_out') {
    // Force-logout signal (e.g. signed in on another device) — do not show a push toast.
    return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'FCM_FORCE_LOGOUT' });
      });
    });
  }

  const title = payload.notification?.title
    ?? payload.data?.title
    ?? 'MYVAGON Notification';

  const body = payload.notification?.body
    ?? payload.data?.body
    ?? payload.data?.notification_body
    ?? '';

  const targetUrl = resolveTargetUrl(payload.data);

  const tag = payload.data?.id
    || (payload.data?.type && payload.data?.type_id ? `myvagon-${payload.data.type}-${payload.data.type_id}` : null)
    || (payload.data?.type ? `myvagon-${payload.data.type}` : 'myvagon-notification');

  const notificationOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag,
    data: {
      url:          targetUrl,
      type:         payload.data?.type      ?? '',
      type_id:      payload.data?.type_id   ?? '',
      external_url: payload.data?.external_url ?? '',
    },
  };

  self.registration.showNotification(title, notificationOptions);
});


// ── Notification click handler ────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data      = event.notification.data ?? {};
  const targetUrl = data.url || resolveTargetUrl(data);

  // If external URL, open in a new browser tab directly
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    const isSameOrigin = targetUrl.startsWith(self.location.origin);
    if (!isSameOrigin) {
      event.waitUntil(clients.openWindow(targetUrl));
      return;
    }
  }

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to find an existing open tab in the same origin
        for (const client of clientList) {
          try {
            const url = new URL(client.url);
            if (url.origin === self.location.origin) {
              client.focus();
              if ('navigate' in client) {
                return client.navigate(targetUrl);
              }
              client.postMessage({ type: 'FCM_NAVIGATE', url: targetUrl });
              return;
            }
          } catch {
            /* ignore malformed URLs */
          }
        }
        // If no tab is currently open, open a new window
        return clients.openWindow(targetUrl);
      })
  );
});
