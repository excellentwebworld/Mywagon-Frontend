import type { ShipperUser } from '../api/auth';

/** Social OAuth prospect (Google / Microsoft). Normal email signup never sets this. */
export function isSocialShipper(user: ShipperUser | null | undefined): boolean {
  return Boolean(user?.social_provider) || user?.signup_complete === false;
}

/** Still needs register required fields (company, phone, address, terms). Social only. */
export function needsSignupComplete(user: ShipperUser | null | undefined): boolean {
  return user?.signup_complete === false;
}

/** Paths allowed while social user fills /complete-signup. */
export function isSignupCompleteAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/complete-signup' || path.startsWith('/complete-signup/')) return true;
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  return false;
}

export function completeSignupPath(from?: string): string {
  const base = '/complete-signup';
  if (!from) return base;
  return `${base}?from=${encodeURIComponent(from)}`;
}
