import type { ShipperUser } from '../api/auth';

/** Social OAuth prospect (Google / Microsoft). Normal email signup never sets this. */
export function isSocialShipper(user: ShipperUser | null | undefined): boolean {
  return Boolean(user?.social_provider) || user?.signup_complete === false;
}

/** Social prospect still missing required signup fields (phone and/or company). */
export function needsSignupComplete(user: ShipperUser | null | undefined): boolean {
  return user?.signup_complete === false;
}

export function needsSocialPhone(user: ShipperUser | null | undefined): boolean {
  if (!needsSignupComplete(user)) return false;
  return !String(user?.phone ?? '').trim();
}

export function needsSocialCompany(user: ShipperUser | null | undefined): boolean {
  if (!needsSignupComplete(user)) return false;
  if (needsSocialPhone(user)) return false;
  const name = String(user?.company_name ?? '').trim();
  const country = String(user?.company_country ?? '').trim();
  return !name || user?.company_address_complete === false || !country;
}

/**
 * Next settings page for an incomplete social prospect.
 * personal (phone) → organization (company/address) → compliance (KYC after signup_complete).
 */
export function socialProfileNextPath(user: ShipperUser | null | undefined): string {
  if (needsSocialPhone(user)) return '/settings/personal';
  if (needsSocialCompany(user) || needsSignupComplete(user)) return '/settings/organization';
  return '/settings/compliance';
}

/** Paths allowed while social required details are incomplete. */
export function isSignupCompleteAllowedPath(
  pathname: string,
  user?: ShipperUser | null,
): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;

  if (needsSocialPhone(user)) {
    return path === '/settings/personal' || path.startsWith('/settings/personal/');
  }

  if (needsSocialCompany(user) || needsSignupComplete(user)) {
    return (
      path === '/settings/organization' ||
      path.startsWith('/settings/organization/') ||
      path === '/settings/personal' ||
      path.startsWith('/settings/personal/')
    );
  }

  return true;
}

/** @deprecated use socialProfileNextPath — kept for older call sites */
export function completeSignupPath(_from?: string, opts?: { blocked?: boolean }): string {
  const base = '/settings/personal';
  return opts?.blocked ? `${base}?blocked=1` : base;
}
