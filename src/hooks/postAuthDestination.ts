import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import { isSocialShipper, needsSignupComplete } from './useSignupCompleteGate';

/**
 * Post-login destination.
 *
 * Social only:
 *   register required fields → KYC → mandatory info form → onboarding tour
 *
 * Normal signup: unchanged (KYC / company / info-form / tour as before).
 */
export function postAuthDestination(user: ShipperUser, fallback = '/dashboard'): string {
  if (needsSignupComplete(user)) {
    return '/complete-signup';
  }

  if (needsKycGate(user)) {
    return '/settings/compliance';
  }

  if (needsCompanyInfoGate(user)) {
    return '/settings/organization?from=company_info';
  }

  if (needsInfoFormHardGate(user)) {
    return '/settings/organization?from=info_form';
  }

  if (user.onboarding_completed === false) {
    return '/dashboard';
  }

  return fallback.startsWith('/') ? fallback : '/dashboard';
}

/**
 * Tour auto-start rules.
 * Social: only after KYC accepted + mandatory info form done.
 * Normal: whenever onboarding_completed is false and they can reach dashboard.
 */
export function canStartOnboardingTour(user: ShipperUser | null | undefined): boolean {
  if (!user) return false;
  if (user.onboarding_completed !== false) return false;

  if (isSocialShipper(user)) {
    if (needsSignupComplete(user)) return false;
    if (user.kyc_status !== 'accepted') return false;
    if (user.info_form_mandatory_completed === false) return false;
  }

  return true;
}
