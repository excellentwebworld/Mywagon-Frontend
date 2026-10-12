import type { ShipperUser } from '../api/auth';
import { needsCompanyInfoGate, needsKycGate } from '../hooks/useKycGate';
import { needsInfoFormHardGate } from '../hooks/useInfoFormGate';
import { needsSignupComplete } from '../hooks/useSignupCompleteGate';

/** Fired when the What's New guide closes so the product tour can start afterwards. */
export const WHATS_NEW_DISMISSED_EVENT = 'shipper:whats-new-dismissed';

/**
 * First visit to the new UI. Does not wait for the product tour:
 * a newly created user has onboarding_completed false and must still see this guide.
 */
export function isWhatsNewPending(user: ShipperUser | null | undefined): boolean {
  if (!user) return false;
  if (user.whats_new_revamp_seen === true) return false;
  if (needsSignupComplete(user)) return false;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
}
