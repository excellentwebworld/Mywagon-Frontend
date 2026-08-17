# Phase 5 — Subscription Plan Frontend (plan)

Replace mock mutations with API. Keep `subscription.css` layout.

## Implement

- Fetch `GET /subscription` on load (skeleton).
- Cycle toggle: display prices; checkout still uses **current interval** for add-ons (document in UI).
- Plan cards from `plans[]`; Current badge; Upgrade only if `upgrade_available_*`.
- Quote modal from `POST /quote` then confirm → `POST /checkout` → `window.location = checkout_url`.
- Return `?t=` → `POST /verify-payment` (reuse Billing return handling).
- Auto-pay toggle on current paid plan.
- Cancel plan modal.
- Status: Active / Cancelled / Days left / Next renewal / VAT note.
- Comparison table from `permissions` (not `mockData`).
- i18n keys already under `subscriptionPage.*` — bind real strings.

## Validations

Match Phase 3. Disable double-submit on Pay.

## Out of scope here

Add-on purchase UI (Phase 6) can sit on the same page but behind feature flag until add-on APIs exist.
