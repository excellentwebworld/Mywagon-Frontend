# Phase 4 — Database & Backend Development (plan)

**Do not implement until Phase 1–3 are accepted.** No catalog table rewrite.

## Backend owner tasks

1. Extract `ShipperSubscriptionService` / `ShipperSubscriptionPaymentService` from `SubscriptionController` + `AddonPurchaseService` (Blade keeps calling the same services).
2. Register routes in `routes/api/shipper.php` under `prefix('subscription')`.
3. Controllers under `App\Http\Controllers\Api\Shipper\V1\Subscription\`.
4. Idempotent verify: lookup `PaymentTransaction` by Viva `transaction_id`.
5. Unique index **only after** duplicate cleanup query. If duplicates exist, use `lockForUpdate` on shipper id.
6. Checkout `merchantTrns.source = shipper_react`, `returnUrl` = `SHIPPER_PANEL_URL/subscription`.
7. Extend existing `paymentSuccess` to redirect SPA when source matches (same as invoices).
8. Feature tests listed in Phase 3.
9. Keep crons; do not add a second renew job.
10. Yearly renew amount: **fix** to `price_yearly * 12` (document as bugfix; matches checkout).
11. Sync add-ons: consider excluding `is_cancelled=1` when applying to new plan (document as bugfix).
12. Authorization + validation server-side only.

## Compatibility

- Blade page must keep working (shared services).
- Carrier/driver checkout still hits the same `paymentSuccess`.
- Invoice slugs unchanged for Billing SPA.

## Transactions

Wrap: create user_subscription + permissions + invoice + payment_history + link transaction.

## Security

- Recompute amounts server-side.
- Bind add-on price to current `subscription_id`.
- Do not accept client VAT.
- Log Viva payloads without card PAN (already truncated by Viva).
