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
 * Normal: before KYC (first login → Info Form first).
 * Social: only after KYC is accepted (never while pending / rejected / not_started).
 */
export function needsInfoFormHardGate(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;

  // Social: mandatory form unlocks only after KYC acceptance.
  if (isSocialShipper(user) && user!.kyc_status !== 'accepted') return false;

  if (user!.info_form_mandatory_completed === false) return true;
  if (user!.info_form_enforce === true && hasCompletedOnboarding(user)) return true;
  return false;
}

export function needsInfoFormSoftReminder(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;
  if (!hasCompletedOnboarding(user)) return false;
  return user!.info_form_soft_reminder === true;
}

/**
 * Paths allowed while info-form hard gate is active.
 * Social after KYC accepted: force organization (mandatory) — do not linger on compliance.
 * Normal: organization + compliance (so Info Form → KYC handoff works).
 */
export function isInfoFormAllowedPath(
  pathname: string,
  user?: ShipperUser | null,
): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
  // Normal: allow KYC after mandatory save without bouncing back to org.
  // Social: after accept, send them to mandatory — compliance is not an escape hatch.
  if (!isSocialShipper(user)) {
    if (path === '/settings/compliance' || path.startsWith('/settings/compliance/')) return true;
  }
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
