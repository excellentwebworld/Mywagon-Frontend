import type { ShipperUser } from '../api/auth';

/** Social OAuth prospect (Google / Microsoft). Normal email signup never sets this. */
export function isSocialShipper(user: ShipperUser | null | undefined): boolean {
  return Boolean(user?.social_provider) || user?.signup_complete === false;
}

/** Still needs register required fields (company, phone, address, terms). Social only. */
export function needsSignupComplete(user: ShipperUser | null | undefined): boolean {
  return user?.signup_complete === false;
}

/**
 * Paths allowed while social required company details are incomplete.
 * Hard-lock like KYC — no other app pages until /complete-signup is finished.
 */
export function isSignupCompleteAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/complete-signup' || path.startsWith('/complete-signup/')) return true;
  return false;
}

export function completeSignupPath(from?: string, opts?: { blocked?: boolean }): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (opts?.blocked) params.set('blocked', '1');
  const qs = params.toString();
  return qs ? `/complete-signup?${qs}` : '/complete-signup';
}
