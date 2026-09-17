import type { ShipperUser } from '../api/auth';
import { isSocialShipper } from './useSignupCompleteGate';

/**
 * KYC hard-gate — same statuses for normal and social after register fields are done.
 * Social may still present as not_started until VAT/cert are submitted.
 */
export function needsKycGate(user: ShipperUser | null | undefined): boolean {
  const status = user?.kyc_status;
  if (status === 'pending' || status === 'rejected') return true;
  if (isSocialShipper(user) && (status === 'not_started' || !status)) return true;
  return false;
}

export function needsCompanyInfoGate(user: ShipperUser | null | undefined): boolean {
  if (!user || user.kyc_status !== 'accepted') return false;
  // Social users fill address in /complete-signup before KYC — skip this gate for them.
  if (isSocialShipper(user)) return false;
  return user.company_address_complete === false;
}

/**
 * Paths allowed while KYC gate is active.
 * Organization allowed so Info Form can be completed while KYC is pending
 * (same for normal + social).
 */
export function isKycGateAllowedPath(
  pathname: string,
  _user?: ShipperUser | null,
): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/settings/compliance' || path.startsWith('/settings/compliance/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
  return false;
}

export function isCompanyInfoGateAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
  if (path === '/settings/compliance' || path.startsWith('/settings/compliance/')) return true;
  return false;
}

export function useKycGate(user: ShipperUser | null | undefined): {
  needsKyc: boolean;
  needsCompanyInfo: boolean;
} {
  return {
    needsKyc: needsKycGate(user),
    needsCompanyInfo: needsCompanyInfoGate(user),
  };
}
