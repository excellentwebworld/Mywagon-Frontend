import type {
  SubscriptionEntitlementEntry,
  SubscriptionEntitlements,
} from '../api/auth/types';

export function readEntitlementEntry(
  entitlements: SubscriptionEntitlements | null | undefined,
  slug: string,
): SubscriptionEntitlementEntry | null {
  if (!entitlements?.permissions) return null;
  return entitlements.permissions[slug] ?? null;
}

export function entitlementAllowed(
  entitlements: SubscriptionEntitlements | null | undefined,
  slug: string,
): boolean {
  return Boolean(readEntitlementEntry(entitlements, slug)?.allowed);
}

export function entitlementRemaining(
  entitlements: SubscriptionEntitlements | null | undefined,
  slug: string,
): number | null {
  const row = readEntitlementEntry(entitlements, slug);
  if (!row || row.type !== 'count') return null;
  if (row.unlimited) return null;
  return typeof row.remaining === 'number' ? row.remaining : null;
}

export function entitlementUnlimited(
  entitlements: SubscriptionEntitlements | null | undefined,
  slug: string,
): boolean {
  return Boolean(readEntitlementEntry(entitlements, slug)?.unlimited);
}
