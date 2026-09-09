import type { ShipperUser } from '../api/auth';

export function needsKycGate(user: ShipperUser | null | undefined): boolean {
  const status = user?.kyc_status;
  return status === 'pending' || status === 'rejected';
}

export function needsCompanyInfoGate(user: ShipperUser | null | undefined): boolean {
  if (!user || user.kyc_status !== 'accepted') return false;
  // Only enforce when API explicitly reports incomplete (avoid locking older clients without the field)
  return user.company_address_complete === false;
}

/** Paths allowed while KYC or company-info gates are active. */
export function isKycGateAllowedPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/billing' || path.startsWith('/billing/')) return true;
  if (path === '/settings/compliance' || path.startsWith('/settings/compliance/')) return true;
  if (path === '/settings/organization' || path.startsWith('/settings/organization/')) return true;
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
