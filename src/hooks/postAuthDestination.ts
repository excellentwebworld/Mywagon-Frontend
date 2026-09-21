import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import { isSocialShipper, needsSignupComplete } from './useSignupCompleteGate';

/**
 * Post-login destination.
 *
 * Social incomplete: /complete-signup (required company profile).
 * Social after company details: KYC first, then info form, then tour.
 * Normal email signup (unchanged): Info Form → KYC → company info → dashboard / tour
 */
export function postAuthDestination(user: ShipperUser, fallback = '/dashboard'): string {
  if (needsSignupComplete(user)) {
    return '/complete-signup';
  }

  // Social prospects: KYC upload/review right after company details
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

  return fallback.startsWith('/') ? fallback : '/dashboard';
}

/**
 * Tour auto-start only after required signup + KYC (and info form) gates clear.
 * Incomplete social prospects never start the tour.
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
