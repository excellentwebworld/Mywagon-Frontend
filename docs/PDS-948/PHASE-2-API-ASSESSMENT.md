# Phase 2 – Database / API / Backend Assessment

**Owner:** Backend developer  
**Depends on:** Phase 1

## Reuse (no new invoice/payment tables)

- `invoices`, `invoice_details`, `payment_transactions`, `payment_histories`
- Spatie media collection `invoice/invoice-receipt`
- Bavix wallet on `Shipper`
- `VivaService::createOrder` + new `getTransaction`
- Settlement rules from `paymentSuccess` invoice branch
- Bank details hardcoded in Blade (same IBAN/BIC/holder)

## New (application layer only)

REST under `auth:sanctum` `/api/shipper/v1/billing/*` for the React panel. No schema migration required for PDS 948.

## Do not build

- Invoice dispute entities
- Managed Payments / escrow
- Self-serve “record payment” that marks invoices paid without Viva, wallet, or admin bank-transfer acceptance
- Dummy Viva order codes when credentials fail

## APIs (final)

See [PHASE-6-INTEGRATION.md](./PHASE-6-INTEGRATION.md).

## Completion criteria

- [x] Gap list vs prototype vs live billing
- [x] Contract frozen for frontend
