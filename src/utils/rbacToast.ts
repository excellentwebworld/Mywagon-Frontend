/**
 * Shared RBAC access-denied toast (Blade ShipperPermission / EnsuresShipperRbac parity).
 * Debounced so route gate + API interceptor + action handlers don't stack duplicates.
 */

export const RBAC_ACCESS_DENIED_DEFAULT =
  'You cannot perform this action as your account does not have permission.';

const DEBOUNCE_MS = 1600;
let lastToastAt = 0;
let lastToastMsg = '';

type ShowToast = (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;

export function toastRbacAccessDenied(showToast: ShowToast, message?: string | null): void {
  const msg = (message && String(message).trim()) || RBAC_ACCESS_DENIED_DEFAULT;
  const now = Date.now();
  if (msg === lastToastMsg && now - lastToastAt < DEBOUNCE_MS) return;
  lastToastAt = now;
  lastToastMsg = msg;
  showToast(msg, 'error');
}

/** True when a 403 body looks like Spatie/shipper RBAC (not plan upgrade / past-due). */
export function isRbacPermissionDeniedMessage(message: unknown): boolean {
  if (typeof message !== 'string' || !message.trim()) return false;
  const m = message.toLowerCase();
  return (
    m.includes('does not have permission') ||
    m.includes('do not have permission') ||
    m.includes('permission to manage') ||
    m.includes('permission to perform')
  );
}
