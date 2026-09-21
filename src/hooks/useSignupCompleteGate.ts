import type { ShipperUser } from '../api/auth';

/** Social OAuth prospect (Google / Microsoft). Normal email signup never sets this. */
export function isSocialShipper(user: ShipperUser | null | undefined): boolean {
  return Boolean(user?.social_provider) || user?.signup_complete === false;
}

/** Still needs register required fields (company, phone, address, terms). Social only. */
export function needsSignupComplete(user: ShipperUser | null | undefined): boolean {
  return user?.signup_complete === false;
}

/** Social prospects may browse all app pages. Kept for callers that still check path. */
export function isSignupCompleteAllowedPath(_pathname: string): boolean {
  return true;
}

export function completeSignupPath(from?: string): string {
  const base = '/complete-signup';
  if (!from) return base;
  return `${base}?from=${encodeURIComponent(from)}`;
}
