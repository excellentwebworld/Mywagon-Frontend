import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import {
  isSocialShipper,
  needsSignupComplete,
} from './useSignupCompleteGate';

function isSubUser(user: ShipperUser): boolean {
  return user.is_sub_user === true || user.type === 'sub_user';
}

/**
 * Post-login destination.
 *
 * Social incomplete: dashboard (browse) — features soft-gated with modal → settings.
 * Social after company details: KYC first.
 * Normal email signup (unchanged): Info Form → KYC → company info → dashboard / tour
 * Sub-users: always dashboard (never restore previous session route).
 */
export function postAuthDestination(user: ShipperUser, fallback = '/dashboard'): string {
  // Incomplete social prospects land on dashboard; profile soft-gated on feature use.
  if (needsSignupComplete(user)) {
    return '/dashboard';
  }

  // Social user with accepted KYC lands on dashboard
  if (isSocialShipper(user) && user.kyc_status === 'accepted') {
    return '/dashboard';
  }

  // Social after company details: KYC first
  if (isSocialShipper(user) && needsKycGate(user)) {
    return '/settings/compliance';
  }

  if (needsInfoFormHardGate(user)) {
    return '/settings/organization?from=info_form';
  }

  if (needsKycGate(user)) {
    return '/settings/compliance';
  }

  if (needsCompanyInfoGate(user)) {
    return '/settings/organization?from=company_info';
  }

  if (user.onboarding_completed === false) {
    return '/dashboard';
  }

  // Sub-users always land on dashboard after login / re-login.
  if (isSubUser(user)) {
    return '/dashboard';
  }

  return fallback.startsWith('/') ? fallback : '/dashboard';
}

/**
 * Tour auto-start only after required signup + KYC (and info form) gates clear.
 */
export function canStartOnboardingTour(user: ShipperUser | null | undefined): boolean {
  if (!user) return false;
  if (user.onboarding_completed !== false) return false;
  if (needsSignupComplete(user)) return false;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
}
