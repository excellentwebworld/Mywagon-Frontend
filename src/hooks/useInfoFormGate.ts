import type { ShipperUser } from '../api/auth';

function isPrimaryShipper(user: ShipperUser | null | undefined): boolean {
  return !!user && user.is_sub_user !== true;
}

function hasCompletedOnboarding(user: ShipperUser | null | undefined): boolean {
  if (!user) return true;
  return user.onboarding_completed !== false;
}

/**
 * Hard lock for mandatory info form — same for normal and social signup.
 * Runs before KYC gate so first login goes to Info Form first.
 */
export function needsInfoFormHardGate(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;

  if (user!.info_form_mandatory_completed === false) return true;
  if (user!.info_form_enforce === true && hasCompletedOnboarding(user)) return true;
  return false;
}

export function needsInfoFormSoftReminder(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;
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
