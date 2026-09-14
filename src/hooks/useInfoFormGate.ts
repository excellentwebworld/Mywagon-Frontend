import type { ShipperUser } from '../api/auth';
import { isSocialShipper } from './useSignupCompleteGate';

function isPrimaryShipper(user: ShipperUser | null | undefined): boolean {
  return !!user && user.is_sub_user !== true;
}

function hasCompletedOnboarding(user: ShipperUser | null | undefined): boolean {
  if (!user) return true;
  return user.onboarding_completed !== false;
}

/**
 * Hard lock for mandatory info form.
 * Social: only after KYC accepted.
 * Normal: unchanged (mandatory incomplete or post-month enforce).
 */
export function needsInfoFormHardGate(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;

  if (isSocialShipper(user)) {
    if (user!.kyc_status !== 'accepted') return false;
    if (user!.info_form_mandatory_completed === false) return true;
    if (user!.info_form_enforce === true && hasCompletedOnboarding(user)) return true;
    return false;
  }

  if (user!.info_form_mandatory_completed === false) return true;
  if (user!.info_form_enforce === true && hasCompletedOnboarding(user)) return true;
  return false;
}

export function needsInfoFormSoftReminder(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;
  if (isSocialShipper(user) && user!.kyc_status !== 'accepted') return false;
  if (!hasCompletedOnboarding(user)) return false;
  return user!.info_form_soft_reminder === true;
}

export function isInfoFormAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
  return false;
}

export function useInfoFormGate(user: ShipperUser | null | undefined): {
  needsHardGate: boolean;
  needsSoftReminder: boolean;
} {
  return {
    needsHardGate: needsInfoFormHardGate(user),
    needsSoftReminder: needsInfoFormSoftReminder(user),
  };
}
