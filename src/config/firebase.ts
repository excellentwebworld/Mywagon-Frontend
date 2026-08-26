/**
 * Firebase SDK initialization for the MYVAGON Shipper Panel.
 *
 * All Firebase configuration is driven by VITE_ environment variables.
 * When the variables are absent (e.g. local development without Firebase),
 * `getMessagingOrNull()` returns null and the FCM integration is silently
 * skipped — the rest of the app is unaffected.
 *
 * Required env vars:
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_AUTH_DOMAIN
 *   VITE_FIREBASE_PROJECT_ID
 *   VITE_FIREBASE_STORAGE_BUCKET
 *   VITE_FIREBASE_MESSAGING_SENDER_ID
 *   VITE_FIREBASE_APP_ID
 *   VITE_FIREBASE_VAPID_KEY
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when all required env vars are present. */
export const isFirebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.messagingSenderId &&
  !!firebaseConfig.appId;

const DEFAULT_VAPID_KEY = 'BHrxfYURNaU47jr828xgzrxEHsFOCZ1dnBM-JXLc_jAJAaxBRvY6fltwO7AhVnR4qy45_LaMBcxnKQIZqru0nrg';

/** VAPID key for FCM web push — required for `getToken()`. */
export const vapidKey: string = import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY;


let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return app;
}

/**
 * Returns a Firebase Messaging instance, or `null` when Firebase is not configured.
 * Safe to call multiple times — singleton pattern.
 */
export function getMessagingOrNull(): Messaging | null {
  if (!isFirebaseConfigured) return null;
  try {
    return getMessaging(getFirebaseApp());
  } catch {
    return null;
  }
}
