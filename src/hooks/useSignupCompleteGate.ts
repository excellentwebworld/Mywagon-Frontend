import type { ShipperUser } from '../api/auth';

/** Social / incomplete signup — browse OK; block KYC hard-gate until company form is done. */
export function needsSignupComplete(user: ShipperUser | null | undefined): boolean {
  return user?.signup_complete === false;
}

export function isSignupCompleteAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/complete-signup' || path.startsWith('/complete-signup/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
  if (path === '/settings/personal' || path.startsWith('/settings/personal/')) return true;
  if (path === '/settings/compliance' || path.startsWith('/settings/compliance/')) return true;
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/support' || path.startsWith('/support/')) return true;
  if (path === '/tutorials' || path.startsWith('/tutorials/')) return true;
  return false;
}

export function completeSignupPath(from?: string): string {
  const base = '/complete-signup';
  if (!from) return base;
  return `${base}?from=${encodeURIComponent(from)}`;
}
