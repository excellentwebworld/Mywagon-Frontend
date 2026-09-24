import { describe, expect, it } from 'vitest';
import type { SubscriptionEntitlements } from '../api/auth/types';
import {
  entitlementAllowed,
  entitlementRemaining,
  entitlementUnlimited,
} from '../utils/subscriptionEntitlements';

const sample: SubscriptionEntitlements = {
  plan_id: 2,
  plan_name: 'Plus',
  interval: 'month',
  permissions: {
    ai_suggested_price: { type: 'status', value: '1', allowed: true },
    partners: {
      type: 'count',
      value: '10',
      allowed: true,
      used: 3,
      remaining: 7,
      unlimited: false,
      limit: 10,
    },
    private_load_limit: {
      type: 'count',
      value: '100000',
      allowed: true,
      used: 1,
      remaining: null,
      unlimited: true,
      limit: null,
    },
    draft_shipment: { type: 'status', value: '0', allowed: false },
  },
};

describe('subscriptionEntitlements helpers', () => {
  it('reads status and count entitlements', () => {
    expect(entitlementAllowed(sample, 'ai_suggested_price')).toBe(true);
    expect(entitlementAllowed(sample, 'draft_shipment')).toBe(false);
    expect(entitlementRemaining(sample, 'partners')).toBe(7);
    expect(entitlementUnlimited(sample, 'private_load_limit')).toBe(true);
  });

  it('returns false/null for missing entitlements', () => {
    expect(entitlementAllowed(null, 'partners')).toBe(false);
    expect(entitlementRemaining(sample, 'ai_suggested_price')).toBeNull();
  });
});
