import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import { needsSignupComplete } from './useSignupCompleteGate';

/**
 * Post-login destination — same sequence for normal and social signup:
 *   complete-signup (social only) → Info Form → KYC → company info → dashboard / tour
 */
export function postAuthDestination(user: ShipperUser, fallback = '/dashboard'): string {
  if (needsSignupComplete(user)) {
    return '/complete-signup';
  }

  // Info Form before KYC (same for social + normal)
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
 * Tour auto-start once the user can reach the dashboard
 * (info form done + KYC accepted — enforced by route gates).
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
