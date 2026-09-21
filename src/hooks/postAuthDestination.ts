import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import { needsSignupComplete } from './useSignupCompleteGate';

/**
 * Post-login destination.
 * Social prospects go straight to the dashboard (browse-only until company/KYC).
 * After company info is saved, same sequence as normal signup:
 *   Info Form → KYC → company info → dashboard / tour
 */
export function postAuthDestination(user: ShipperUser, fallback = '/dashboard'): string {
  if (needsSignupComplete(user)) {
    return '/dashboard';
  }

  // Info Form before KYC (same for social + normal after signup fields)
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
 * Tour auto-start on dashboard.
 * Social prospects get the same step-by-step tutorial immediately.
 * Fully signed-up users start it after info form + KYC (enforced by route gates).
 */
export function canStartOnboardingTour(user: ShipperUser | null | undefined): boolean {
  if (!user) return false;
  if (user.onboarding_completed !== false) return false;
  if (needsSignupComplete(user)) return true;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
}
