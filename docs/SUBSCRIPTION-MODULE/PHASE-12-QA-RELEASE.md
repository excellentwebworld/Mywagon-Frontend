# Phase 12 — QA & Production Readiness (template)

Fill this file when implementation is done. Until then it is a checklist only.

## Implemented features

- (TBD)

## Changed files / modules

- (TBD)

## New / modified APIs

- See Phase 3; list final routes.

## Database changes

- Prefer: none, or unique `payment_transactions.transaction_id`.

## Plans / add-ons

- Loaded from production DB dump, not mock.

## Payment flow

- Viva source `shipper_react`, return `/subscription`.

## Dependencies

- Billing SPA, `SHIPPER_PANEL_URL`, Viva, AADE invoice submit, seat lifecycle, permission helper.

## Deploy

- Deploy API before SPA.
- No new cron if existing Kernel entries remain.
- Env: existing Viva + `SHIPPER_PANEL_URL`.

## Testing results

- Phase 9 / 10 / 11 sign-off.

## Remaining issues

- List known old-panel bugs **not** fixed, if any.
