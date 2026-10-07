import type { ShipperUser } from '../api/auth/types';
import { uiSwitchService } from '../api/services/uiSwitchService';
import { needsCompanyInfoGate, needsKycGate } from '../hooks/useKycGate';
import { needsInfoFormHardGate } from '../hooks/useInfoFormGate';
import { needsSignupComplete } from '../hooks/useSignupCompleteGate';

/** Gates that must clear before bouncing a classic-preferring user off React. */
export function canRedirectToClassicPanel(user: ShipperUser | null | undefined): boolean {
  if (!user) return false;
  if (user.ui_switch_enabled === false) return false;
  if ((user.preferred_ui || 'classic') !== 'classic') return false;
  if (needsSignupComplete(user)) return false;
  if (needsInfoFormHardGate(user)) return false;
  if (needsKycGate(user)) return false;
  if (needsCompanyInfoGate(user)) return false;
  return true;
}

let redirectInFlight = false;

/**
 * If the shipper prefers Classic and gates are clear, leave React via handoff.
 * Returns true when a redirect was started (caller should stop further navigation).
 */
export async function redirectToClassicPanelIfNeeded(
  user: ShipperUser | null | undefined,
): Promise<boolean> {
  if (!canRedirectToClassicPanel(user) || redirectInFlight) {
    return false;
  }
  redirectInFlight = true;
  try {
    const { redirect_url } = await uiSwitchService.switchTo('classic');
    window.location.assign(redirect_url);
    return true;
  } catch {
    redirectInFlight = false;
    return false;
  }
}
