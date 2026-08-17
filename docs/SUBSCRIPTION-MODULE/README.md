# Shipper Subscription Module — Phase Plan

Implement the React Shipper Panel Subscription page and JSON APIs by **preserving the live Laravel subscription + add-on + Viva behavior**. Do not invent plans, prices, add-ons, or lifecycle rules.

**Status:** Phase 1–3 documented. **Phase 4–6 in progress:** `/api/shipper/v1/subscription` APIs and React page wired to live data (mock checkout removed).

Prices, permission values, and add-on amounts live in the database (`subscriptions`, `subscription_permissions`, `addons`, `addon_price`). The React mock in `src/pages/Subscription/mockData.ts` is a prototype and must **not** be treated as source of truth.

## Documents

| Doc | Owner | Purpose |
| --- | --- | --- |
| [PHASE-1-EXISTING-SYSTEM.md](./PHASE-1-EXISTING-SYSTEM.md) | FE + BE | Old panel architecture, plans, payment, renewal, cancel, DB, cron, notifications, business rules |
| [PHASE-1B-ADDONS.md](./PHASE-1B-ADDONS.md) | FE + BE | Every shipper add-on, pricing type, permissions, edge cases |
| [PHASE-2-UI-UX.md](./PHASE-2-UI-UX.md) | Frontend | Old Blade vs new React mapping |
| [PHASE-3-API-DESIGN.md](./PHASE-3-API-DESIGN.md) | Backend | Reuse vs new APIs; request/response contracts |
| [PHASE-4-DATABASE-BACKEND.md](./PHASE-4-DATABASE-BACKEND.md) | Backend | Implementation plan (no schema rewrite unless required) |
| [PHASE-5-PLAN-FRONTEND.md](./PHASE-5-PLAN-FRONTEND.md) | Frontend | Plan listing, upgrade, cancel, status |
| [PHASE-6-ADDON-FRONTEND.md](./PHASE-6-ADDON-FRONTEND.md) | Frontend | Recurring + one-time add-ons |
| [PHASE-7-PAYMENT.md](./PHASE-7-PAYMENT.md) | BE + FE | Viva, invoices, webhooks, idempotency |
| [PHASE-8-INTEGRATION.md](./PHASE-8-INTEGRATION.md) | FE + BE | Wire SPA to `/api/shipper/v1/subscription/*` |
| [PHASE-9-LIFECYCLE-TESTING.md](./PHASE-9-LIFECYCLE-TESTING.md) | QA + both | Positive lifecycle |
| [PHASE-10-NEGATIVE-TESTING.md](./PHASE-10-NEGATIVE-TESTING.md) | QA + both | Negative / race / webhook |
| [PHASE-11-REGRESSION.md](./PHASE-11-REGRESSION.md) | QA | Dependent modules |
| [PHASE-12-QA-RELEASE.md](./PHASE-12-QA-RELEASE.md) | Both | Production readiness template |

Backend pointer: `MV_Backend_API/docs/SUBSCRIPTION-MODULE.md`.

Related: Billing SPA is PDS-948 (`docs/PDS-948/`). Subscription invoices already appear there (`slug = subscription` / `add-on`). Do not duplicate billing list/pay-invoice APIs.

## Split of work

| Area | Backend | Frontend |
| --- | --- | --- |
| Plan catalog, current plan, entitlements | JSON APIs wrapping `Subscription`, `UserSubscription`, `UserSubscriptionPermission` | Plan cards, comparison, usage |
| Quote (proration + VAT) | Port of `calculatePayment` | Upgrade modal totals |
| Purchase / upgrade | Viva order + `payment-success` with `source=shipper_react` | Redirect + return verify |
| Auto-pay toggle | Port of `autoPay` | Toggle (old panel has this; mock “Coming Soon” is **wrong**) |
| Cancel plan | Port of `cancelPlan` | Confirmation modal |
| Add-on quote / purchase / cancel / auto-pay | Port of `getAddonPrice`, `AddonController`, `AddonPurchaseService` | Add-on lists + purchased grid |
| Cron / renewal / expiry | Keep existing commands; do not duplicate | Display next renewal / cancelled / expired |
| Feature gates | Existing `CommonHelper::checkSubscriptionPermission` + API 403s | `SubscriptionGateModal` → `/subscription` |

## Non-negotiable rules

1. Inspected Laravel behavior wins over the React mock and over Miro copy when they conflict.
2. Do not start coding until Phase 1–3 are reviewed.
3. Do not change `subscriptions` / `user_subscriptions` / `subscription_addons` schema unless a documented gap cannot be solved in application code.
4. Reuse `VivaService` and the PDS-948 `source=shipper_react` redirect pattern.
5. Webhooks and payment-success must be **idempotent** (old code is not; this is a required hardening for the SPA).
6. Sub-users inherit the parent shipper’s subscription (`CommonHelper::getShipperId()`).
7. Past-due invoice middleware stays as-is (Billing, not Subscription purchase).

## Current code map (inspected)

| Layer | Path |
| --- | --- |
| Old shipper UI | `MV_Backend_API/resources/views/shipper/subscription/subscription.blade.php` |
| Old web controller | `App\Http\Controllers\Shipper\Subscription\SubscriptionController` |
| Add-on web | `App\Http\Controllers\AddonController` |
| Purchase service | `App\Services\AddonPurchaseService` |
| Admin upgrade helper | `App\Services\SubscriptionUpgradeService` |
| Entitlement sync | `App\Services\SubscriptionService` |
| Web routes | `routes/shipper.php` prefix `subscription` |
| Public Viva return | `GET/POST payment-success`, `payment-failed` in `routes/web.php` |
| React UI (mock only) | `shipper_react/src/pages/Subscription/*` |
| React route | `/subscription` |
| Shipper JSON APIs | **None** for subscription (only billing under `/api/shipper/v1/billing`) |
