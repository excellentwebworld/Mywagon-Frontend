import type { ShipperUser } from '../api/auth';

function isPrimaryShipper(user: ShipperUser | null | undefined): boolean {
  return !!user && user.is_sub_user !== true;
}

/** Hard lock: mandatory ops incomplete, or post–1-month enforce (≤90% completion). */
export function needsInfoFormHardGate(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;
  // Only enforce when API explicitly reports flags (avoid locking older clients)
  if (user!.info_form_mandatory_completed === false) return true;
  if (user!.info_form_enforce === true) return true;
  return false;
}

export function needsInfoFormSoftReminder(user: ShipperUser | null | undefined): boolean {
  if (!isPrimaryShipper(user)) return false;
  return user!.info_form_soft_reminder === true;
}

/** Paths allowed while the info-form hard gate is active. */
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
