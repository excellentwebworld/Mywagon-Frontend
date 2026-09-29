import { describe, expect, it } from 'vitest';
import type { SubscriptionEntitlements } from '../api/auth/types';
import {
  entitlementAllowed,
  entitlementRemaining,
  entitlementUnlimited,
  readEntitlementEntry,
} from '../utils/subscriptionEntitlements';

/**
 * Complete Shipper Subscription Permissions Catalog (35 permissions)
 * Evaluated across all 3 tiers: Essential (Free), Plus (Tier 2), Pro (Tier 3)
 */

export const ESSENTIAL_ENTITLEMENTS: SubscriptionEntitlements = {
  plan_id: 1,
  plan_name: 'Essential',
  interval: 'month',
  permissions: {
    private_loads: { type: 'status', value: '1', allowed: true },
    public_loads: { type: 'status', value: '1', allowed: true },
    draft_shipment: { type: 'status', value: '1', allowed: true },
    search_available_trucks: { type: 'status', value: '1', allowed: true },
    partners: { type: 'count', value: '5', allowed: true, used: 2, remaining: 3, unlimited: false, limit: 5 },
    send_tracking_links_to_your_customers_per_month: { type: 'count', value: '5', allowed: true, used: 1, remaining: 4, unlimited: false, limit: 5 },
    dispatcher_users: { type: 'count', value: '1', allowed: true, used: 1, remaining: 0, unlimited: false, limit: 1 },
    private_load_limit: { type: 'count', value: '5', allowed: false, used: 5, remaining: 0, unlimited: false, limit: 5 },
    public_load_limit: { type: 'count', value: '5', allowed: true, used: 2, remaining: 3, unlimited: false, limit: 5 },
    live_gps_shipment_tracking: { type: 'status', value: '1', allowed: true },
    chat_with_carriers_drivers: { type: 'status', value: '1', allowed: true },
    view_electronic_pods: { type: 'status', value: '1', allowed: true },
    view_map: { type: 'status', value: '1', allowed: true },
    allow_multiple_stops: { type: 'status', value: '0', allowed: false },
    count_of_bids_per_month: { type: 'count', value: '10', allowed: true, used: 10, remaining: 0, unlimited: false, limit: 10 },
    view_if_public_bids_have_been_submitted_for_a_posted_truck: { type: 'status', value: '0', allowed: false },
    view_current_best_bid_for_a_posted_truck: { type: 'status', value: '0', allowed: false },
    profile_management: { type: 'status', value: '1', allowed: true },
    account_statement: { type: 'status', value: '1', allowed: true },
    notifications: { type: 'status', value: '1', allowed: true },
    manage_shipment: { type: 'status', value: '1', allowed: true },
    feedback_and_support: { type: 'status', value: '1', allowed: true },
    subscription_module: { type: 'status', value: '1', allowed: true },
    manage_address_book_master: { type: 'status', value: '1', allowed: true },
    manage_product_master: { type: 'status', value: '1', allowed: true },
    manage_erp_orders: { type: 'status', value: '0', allowed: false },
    create_shipment_from_search_available_truck: { type: 'status', value: '1', allowed: true },
    view_matched_trucks_for_availability: { type: 'status', value: '1', allowed: true },
    filter_and_search_in_all_the_modules: { type: 'status', value: '1', allowed: true },
    fee_per_completed_shipments: { type: 'percentage', value: '0', allowed: true },
    disabled_ads: { type: 'status', value: '0', allowed: false },
    penalty_for_canceling_shipment: { type: 'percentage', value: '0', allowed: true },
    rating_and_review_for_transporter: { type: 'status', value: '1', allowed: true },
    actual_travelled_route: { type: 'status', value: '0', allowed: false },
    ai_suggested_price: { type: 'status', value: '0', allowed: false },
  },
};

export const PLUS_ENTITLEMENTS: SubscriptionEntitlements = {
  plan_id: 2,
  plan_name: 'Plus',
  interval: 'month',
  permissions: {
    private_loads: { type: 'status', value: '1', allowed: true },
    public_loads: { type: 'status', value: '1', allowed: true },
    draft_shipment: { type: 'status', value: '1', allowed: true },
    search_available_trucks: { type: 'status', value: '1', allowed: true },
    partners: { type: 'count', value: '50', allowed: true, used: 12, remaining: 38, unlimited: false, limit: 50 },
    send_tracking_links_to_your_customers_per_month: { type: 'count', value: '50', allowed: true, used: 10, remaining: 40, unlimited: false, limit: 50 },
    dispatcher_users: { type: 'count', value: '5', allowed: true, used: 2, remaining: 3, unlimited: false, limit: 5 },
    private_load_limit: { type: 'count', value: '200', allowed: true, used: 15, remaining: 185, unlimited: false, limit: 200 },
    public_load_limit: { type: 'count', value: '100', allowed: true, used: 20, remaining: 80, unlimited: false, limit: 100 },
    live_gps_shipment_tracking: { type: 'status', value: '1', allowed: true },
    chat_with_carriers_drivers: { type: 'status', value: '1', allowed: true },
    view_electronic_pods: { type: 'status', value: '1', allowed: true },
    view_map: { type: 'status', value: '1', allowed: true },
    allow_multiple_stops: { type: 'status', value: '1', allowed: true },
    count_of_bids_per_month: { type: 'count', value: '50', allowed: true, used: 5, remaining: 45, unlimited: false, limit: 50 },
    view_if_public_bids_have_been_submitted_for_a_posted_truck: { type: 'status', value: '1', allowed: true },
    view_current_best_bid_for_a_posted_truck: { type: 'status', value: '1', allowed: true },
    profile_management: { type: 'status', value: '1', allowed: true },
    account_statement: { type: 'status', value: '1', allowed: true },
    notifications: { type: 'status', value: '1', allowed: true },
    manage_shipment: { type: 'status', value: '1', allowed: true },
    feedback_and_support: { type: 'status', value: '1', allowed: true },
    subscription_module: { type: 'status', value: '1', allowed: true },
    manage_address_book_master: { type: 'status', value: '1', allowed: true },
    manage_product_master: { type: 'status', value: '1', allowed: true },
    manage_erp_orders: { type: 'status', value: '1', allowed: true },
    create_shipment_from_search_available_truck: { type: 'status', value: '1', allowed: true },
    view_matched_trucks_for_availability: { type: 'status', value: '1', allowed: true },
    filter_and_search_in_all_the_modules: { type: 'status', value: '1', allowed: true },
    fee_per_completed_shipments: { type: 'percentage', value: '0', allowed: true },
    disabled_ads: { type: 'status', value: '1', allowed: true },
    penalty_for_canceling_shipment: { type: 'percentage', value: '0', allowed: true },
    rating_and_review_for_transporter: { type: 'status', value: '1', allowed: true },
    actual_travelled_route: { type: 'status', value: '0', allowed: false },
    ai_suggested_price: { type: 'status', value: '1', allowed: true },
  },
};

export const PRO_ENTITLEMENTS: SubscriptionEntitlements = {
  plan_id: 3,
  plan_name: 'Pro',
  interval: 'month',
  permissions: {
    private_loads: { type: 'status', value: '1', allowed: true },
    public_loads: { type: 'status', value: '1', allowed: true },
    draft_shipment: { type: 'status', value: '1', allowed: true },
    search_available_trucks: { type: 'status', value: '1', allowed: true },
    partners: { type: 'count', value: '100000', allowed: true, used: 25, remaining: null, unlimited: true, limit: null },
    send_tracking_links_to_your_customers_per_month: { type: 'count', value: '100000', allowed: true, used: 80, remaining: null, unlimited: true, limit: null },
    dispatcher_users: { type: 'count', value: '100000', allowed: true, used: 12, remaining: null, unlimited: true, limit: null },
    private_load_limit: { type: 'count', value: '100000', allowed: true, used: 450, remaining: null, unlimited: true, limit: null },
    public_load_limit: { type: 'count', value: '100000', allowed: true, used: 300, remaining: null, unlimited: true, limit: null },
    live_gps_shipment_tracking: { type: 'status', value: '1', allowed: true },
    chat_with_carriers_drivers: { type: 'status', value: '1', allowed: true },
    view_electronic_pods: { type: 'status', value: '1', allowed: true },
    view_map: { type: 'status', value: '1', allowed: true },
    allow_multiple_stops: { type: 'status', value: '1', allowed: true },
    count_of_bids_per_month: { type: 'count', value: '100000', allowed: true, used: 120, remaining: null, unlimited: true, limit: null },
    view_if_public_bids_have_been_submitted_for_a_posted_truck: { type: 'status', value: '1', allowed: true },
    view_current_best_bid_for_a_posted_truck: { type: 'status', value: '1', allowed: true },
    profile_management: { type: 'status', value: '1', allowed: true },
    account_statement: { type: 'status', value: '1', allowed: true },
    notifications: { type: 'status', value: '1', allowed: true },
    manage_shipment: { type: 'status', value: '1', allowed: true },
    feedback_and_support: { type: 'status', value: '1', allowed: true },
    subscription_module: { type: 'status', value: '1', allowed: true },
    manage_address_book_master: { type: 'status', value: '1', allowed: true },
    manage_product_master: { type: 'status', value: '1', allowed: true },
    manage_erp_orders: { type: 'status', value: '1', allowed: true },
    create_shipment_from_search_available_truck: { type: 'status', value: '1', allowed: true },
    view_matched_trucks_for_availability: { type: 'status', value: '1', allowed: true },
    filter_and_search_in_all_the_modules: { type: 'status', value: '1', allowed: true },
    fee_per_completed_shipments: { type: 'percentage', value: '0', allowed: true },
    disabled_ads: { type: 'status', value: '1', allowed: true },
    penalty_for_canceling_shipment: { type: 'percentage', value: '0', allowed: true },
    rating_and_review_for_transporter: { type: 'status', value: '1', allowed: true },
    actual_travelled_route: { type: 'status', value: '1', allowed: true },
    ai_suggested_price: { type: 'status', value: '1', allowed: true },
  },
};

describe('Subscription Permissions Matrix Across All Plans', () => {
  describe('Essential Plan Verification', () => {
    it('enforces multi-stop restriction', () => {
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'allow_multiple_stops')).toBe(false);
    });

    it('enforces dispatcher user limit (max 1, remaining 0 when full)', () => {
      expect(entitlementRemaining(ESSENTIAL_ENTITLEMENTS, 'dispatcher_users')).toBe(0);
      expect(entitlementUnlimited(ESSENTIAL_ENTITLEMENTS, 'dispatcher_users')).toBe(false);
    });

    it('enforces private load limit quota (remaining 0 when exhausted)', () => {
      expect(entitlementRemaining(ESSENTIAL_ENTITLEMENTS, 'private_load_limit')).toBe(0);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'private_load_limit')).toBe(false);
    });

    it('blocks premium features: AI suggested price, Actual Travelled Route, ERP orders, Best Bid visibility', () => {
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'ai_suggested_price')).toBe(false);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'actual_travelled_route')).toBe(false);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'manage_erp_orders')).toBe(false);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'view_current_best_bid_for_a_posted_truck')).toBe(false);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'view_if_public_bids_have_been_submitted_for_a_posted_truck')).toBe(false);
    });

    it('allows basic features', () => {
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'draft_shipment')).toBe(true);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'chat_with_carriers_drivers')).toBe(true);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'live_gps_shipment_tracking')).toBe(true);
      expect(entitlementAllowed(ESSENTIAL_ENTITLEMENTS, 'view_electronic_pods')).toBe(true);
    });
  });

  describe('Plus Plan Verification', () => {
    it('unlocks multi-stop shipments', () => {
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'allow_multiple_stops')).toBe(true);
    });

    it('unlocks AI suggested price & ERP orders', () => {
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'ai_suggested_price')).toBe(true);
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'manage_erp_orders')).toBe(true);
    });

    it('unlocks bid visibility features', () => {
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'view_current_best_bid_for_a_posted_truck')).toBe(true);
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'view_if_public_bids_have_been_submitted_for_a_posted_truck')).toBe(true);
    });

    it('has higher counted limits', () => {
      expect(entitlementRemaining(PLUS_ENTITLEMENTS, 'private_load_limit')).toBe(185);
      expect(entitlementRemaining(PLUS_ENTITLEMENTS, 'dispatcher_users')).toBe(3);
      expect(entitlementRemaining(PLUS_ENTITLEMENTS, 'partners')).toBe(38);
    });

    it('still restricts Pro-only features: Actual Travelled Route', () => {
      expect(entitlementAllowed(PLUS_ENTITLEMENTS, 'actual_travelled_route')).toBe(false);
    });
  });

  describe('Pro Plan Verification', () => {
    it('unlocks Actual Travelled Route', () => {
      expect(entitlementAllowed(PRO_ENTITLEMENTS, 'actual_travelled_route')).toBe(true);
    });

    it('provides unlimited allowances across all count quotas', () => {
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'private_load_limit')).toBe(true);
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'public_load_limit')).toBe(true);
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'dispatcher_users')).toBe(true);
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'partners')).toBe(true);
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'send_tracking_links_to_your_customers_per_month')).toBe(true);
      expect(entitlementUnlimited(PRO_ENTITLEMENTS, 'count_of_bids_per_month')).toBe(true);
    });

    it('has null remaining for unlimited entitlements', () => {
      expect(entitlementRemaining(PRO_ENTITLEMENTS, 'private_load_limit')).toBeNull();
      expect(entitlementRemaining(PRO_ENTITLEMENTS, 'dispatcher_users')).toBeNull();
    });
  });

  describe('Upgrade Transition Verification', () => {
    it('dynamically updates permissions when upgrading from Essential to Plus', () => {
      let state = { ...ESSENTIAL_ENTITLEMENTS };
      expect(entitlementAllowed(state, 'allow_multiple_stops')).toBe(false);
      expect(entitlementAllowed(state, 'ai_suggested_price')).toBe(false);

      // Upgrade to Plus
      state = { ...PLUS_ENTITLEMENTS };
      expect(entitlementAllowed(state, 'allow_multiple_stops')).toBe(true);
      expect(entitlementAllowed(state, 'ai_suggested_price')).toBe(true);
      expect(entitlementRemaining(state, 'dispatcher_users')).toBe(3);
    });

    it('dynamically updates permissions when upgrading from Plus to Pro', () => {
      let state = { ...PLUS_ENTITLEMENTS };
      expect(entitlementAllowed(state, 'actual_travelled_route')).toBe(false);
      expect(entitlementUnlimited(state, 'private_load_limit')).toBe(false);

      // Upgrade to Pro
      state = { ...PRO_ENTITLEMENTS };
      expect(entitlementAllowed(state, 'actual_travelled_route')).toBe(true);
      expect(entitlementUnlimited(state, 'private_load_limit')).toBe(true);
    });

    it('dynamically updates quota upon Add-on purchase', () => {
      // Simulate Essential user purchasing 2 additional dispatcher seats
      const updatedEssential: SubscriptionEntitlements = {
        ...ESSENTIAL_ENTITLEMENTS,
        permissions: {
          ...ESSENTIAL_ENTITLEMENTS.permissions,
          dispatcher_users: {
            type: 'count',
            value: '3', // 1 base + 2 addon
            allowed: true,
            used: 1,
            remaining: 2,
            unlimited: false,
            limit: 3,
          },
        },
      };

      expect(entitlementRemaining(updatedEssential, 'dispatcher_users')).toBe(2);
      expect(entitlementAllowed(updatedEssential, 'dispatcher_users')).toBe(true);
    });
  });
});
