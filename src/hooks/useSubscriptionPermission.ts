import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUpgradeGate, type UpgradeGateOptions } from '../context/UpgradeGateContext';
import type {
  SubscriptionEntitlementEntry,
  SubscriptionEntitlements,
} from '../api/auth/types';
import {
  entitlementAllowed,
  entitlementRemaining,
  entitlementUnlimited,
  readEntitlementEntry,
} from '../utils/subscriptionEntitlements';

export type UseSubscriptionPermissionResult = {
  entitlements: SubscriptionEntitlements | null;
  planName: string | null;
  planId: number | null;
  can: (slug: string) => boolean;
  value: (slug: string) => string | null;
  remaining: (slug: string) => number | null;
  used: (slug: string) => number | null;
  isUnlimited: (slug: string) => boolean;
  entry: (slug: string) => SubscriptionEntitlementEntry | null;
  /** Opens global upgrade modal when denied; returns true when allowed. */
  requirePermission: (slug: string, options?: UpgradeGateOptions) => boolean;
};

export function useSubscriptionPermission(): UseSubscriptionPermissionResult {
  const { user } = useAuth();
  const { openUpgradeGate } = useUpgradeGate();
  const entitlements = user?.subscription_entitlements ?? null;

  const entry = useCallback(
    (slug: string) => readEntitlementEntry(entitlements, slug),
    [entitlements],
  );

  const can = useCallback(
    (slug: string) => entitlementAllowed(entitlements, slug),
    [entitlements],
  );

  const value = useCallback(
    (slug: string) => {
      const row = entry(slug);
      return row ? String(row.value) : null;
    },
    [entry],
  );

  const remaining = useCallback(
    (slug: string) => entitlementRemaining(entitlements, slug),
    [entitlements],
  );

  const used = useCallback(
    (slug: string) => {
      const row = entry(slug);
      if (!row || row.type !== 'count') return null;
      return typeof row.used === 'number' ? row.used : null;
    },
    [entry],
  );

  const isUnlimited = useCallback(
    (slug: string) => entitlementUnlimited(entitlements, slug),
    [entitlements],
  );

  const requirePermission = useCallback(
    (slug: string, options?: UpgradeGateOptions) => {
      if (can(slug)) return true;
      openUpgradeGate({
        upgradeUrl: '/subscription',
        ...options,
      });
      return false;
    },
    [can, openUpgradeGate],
  );

  return useMemo(
    () => ({
      entitlements,
      planName: entitlements?.plan_name ?? null,
      planId: entitlements?.plan_id ?? null,
      can,
      value,
      remaining,
      used,
      isUnlimited,
      entry,
      requirePermission,
    }),
    [entitlements, can, value, remaining, used, isUnlimited, entry, requirePermission],
  );
}
