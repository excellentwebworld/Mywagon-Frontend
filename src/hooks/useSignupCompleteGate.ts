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

export type SocialProfileStep = 'phone' | 'company' | 'kyc' | 'generic';

/** Which required profile step is next (for modal copy + redirect). */
export function socialProfileStep(user: ShipperUser | null | undefined): SocialProfileStep {
  if (!needsSignupComplete(user)) return 'generic';
  if (needsSocialPhone(user)) return 'phone';
  if (needsSocialCompany(user)) return 'company';
  return 'kyc';
}

/**
 * Next settings page for an incomplete social prospect.
 * personal (phone) → organization (company/address) → compliance (KYC after signup_complete).
 */
export function socialProfileNextPath(user: ShipperUser | null | undefined): string {
  switch (socialProfileStep(user)) {
    case 'phone':
      return '/settings/personal';
    case 'company':
      return '/settings/organization?from=social_setup';
    case 'kyc':
      return '/settings/compliance';
    default:
      return '/settings/personal';
  }
}

/**
 * Incomplete social users may only browse the dashboard.
 * Settings (and billing for past-due) stay allowed so “Complete Now” / profile
 * KYC steps and payment recovery still work — no other feature pages.
 */
export function isSignupCompleteAllowedPath(
  pathname: string,
  _user?: ShipperUser | null,
): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/dashboard') return true;
  if (path === '/settings' || path.startsWith('/settings/')) return true;
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  return false;
}

/** @deprecated use socialProfileNextPath — kept for older call sites */
export function completeSignupPath(_from?: string, opts?: { blocked?: boolean }): string {
  const base = '/settings/personal';
  return opts?.blocked ? `${base}?blocked=1` : base;
}

/** Custom event: open incomplete-profile modal from soft gates / API 403. */
export const SIGNUP_INCOMPLETE_MODAL_EVENT = 'shipper:signup-incomplete-modal';

export function openSignupIncompleteModal(): void {
  window.dispatchEvent(new CustomEvent(SIGNUP_INCOMPLETE_MODAL_EVENT));
}
