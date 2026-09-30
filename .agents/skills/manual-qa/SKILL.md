---
name: manual-qa
description: Manual QA verification skill for executing, tracking, and reporting manual testing of features, subscription permissions, upgrade flows, Viva Wallet integration, and UI gates across Shipper React and MV Backend API.
---

# Manual QA Testing & Verification Skill

This skill defines standard operating procedures for executing manual QA testing across the MYVAGON Shipper React frontend and Laravel Backend API.

## Core QA Principles

1. **Deterministic Test Matrix**: Every scenario must have a clear precondition, step-by-step action, expected outcome, and actual result.
2. **End-to-End Traceability**: Validate the complete chain: Database State → Backend API Response (`/api/v1/shipper/subscription/*`, `/api/v1/shipper/auth/me`) → React State / RBAC / Gate Modals (`UpgradeGateContext`, `useUpgradeGate`) → Viva Wallet Checkout & Verification → Invoice & Email Dispatch.
3. **Proration & Calculation Accuracy**: Verify currency amounts, VAT calculation (24% Greek VAT vs 0% Non-Greek), remaining days calculation, and credit proration down to 2 decimal places.
4. **Defect Severity Tagging**: Classify findings as Blocker (P0), Critical (P1), Major (P2), or Minor/Cosmetic (P3).

---

## Subscription & Entitlements QA Execution Matrix

### 1. Plan Restriction & 35-Permission Verification
- **Essential Plan (Free / Tier 1)**:
  - Private load limits & public load limits restricted (5/cycle).
  - Dispatcher user seat limits enforced (max 1 user).
  - Multi-stop shipments blocked (>2 stops triggers UpgradeGate).
  - Premium features disabled: `allow_multiple_stops`, `ai_suggested_price`, `actual_travelled_route`, `manage_erp_orders`, `view_current_best_bid_for_a_posted_truck`, `view_if_public_bids_have_been_submitted_for_a_posted_truck`, `disabled_ads`.
- **Plus Plan (Tier 2)**:
  - Higher quota: 200 private loads, 100 public loads, 50 partners, 5 dispatcher seats.
  - Unlocked features: `allow_multiple_stops`, `ai_suggested_price`, `manage_erp_orders`, `disabled_ads`, bid visibility tools.
  - Pro-only restricted: `actual_travelled_route` (only available on Pro).
- **Pro Plan (Tier 3)**:
  - Unlimited quota (`100,000` / no ceiling) for shipments, bids, tracking links, and dispatcher seats.
  - All 35 permissions active and unlocked without gating modals.

### 2. Upgrades & Proration Lifecycle
- **Same Cycle Upgrade (Monthly Plus → Monthly Pro)**:
  - Subtotal calculation: $P_{new} - (UsedDays / TotalDays) \times P_{new}$ (or current plan credit offset).
  - Expiry date is preserved (`keeps_expire_date: true`).
  - Permissions sync immediately upon payment success.
- **Cycle Shift Upgrade (Monthly Plus → Yearly Pro)**:
  - Subtotal calculation: Full yearly charge ($12 \times P_{yearly}$).
  - No proration applied (`prorated: false`).
  - Expiry date extends by 1 full year from transaction date (`now() + 1 year`).
- **Yearly Plan Rules**:
  - Downward change or switch to Monthly is blocked (`upgrade_not_allowed`).
  - Upgrades within yearly tier only allowed to strictly higher tier.

### 3. Add-on Purchase & Entitlement Expansion
- Purchase Add-on (e.g., extra seats, extra private load quota).
- Verify Viva Wallet checkout flow for Add-on.
- Ensure `SubscriptionAddon` records created and permissions sync via `SyncUserSubscriptionPlanPermissionsService`.
- Verify quota counter increases in UI and gates open immediately.

### 4. Viva Wallet Checkout & Webhook/Verification
- Checkout URL generation with valid order code and merchant transaction payload.
- Return/callback handling on staging environment.
- Verification endpoint `/verify-payment` idempotency (duplicate transaction check).
- Invoice generation (`Invoice`, `InvoiceDetail`) with VAT tax calculations.
- Notification dispatch: Email sent with invoice/receipt (`PaymentReceiptNotification`).

---

## Test Execution Workflow

1. **Environment & Seed Setup**: Set up shipper test accounts for each plan tier (Essential, Plus, Pro).
2. **Scenario Execution**: Walk through each test case sequentially in the UI and via API.
3. **Log & DB Verification**: Inspect Laravel logs (`storage/logs/laravel.log`) and DB tables (`user_subscriptions`, `user_subscription_permissions`, `payment_transactions`, `invoices`).
4. **Status Reporting**: Document PASS / FAIL status with screenshots or step logs.
