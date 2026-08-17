# Phase 3 – Backend Development

**Owner:** Backend developer  
**Depends on:** Phase 2 contract

## Modules

| File | Role |
| --- | --- |
| `app/Services/Shipper/ShipperBillingService.php` | Query/transform invoices, summary, wallet credits, aging, bank details |
| `app/Services/Shipper/ShipperInvoicePaymentService.php` | Viva order, verify, wallet pay, bank receipt, adjustment request, locked settle |
| `app/Services/VivaService.php` | `getTransaction()` added |
| `app/Http/Controllers/Api/Shipper/V1/Billing/*` | Thin HTTP layer |
| `routes/api/shipper.php` | Billing route group |
| `SubscriptionController::paymentWebhook` / `paymentSuccess` | Pass `merchantTrns.source`; React return URL |

## Rules

- Always filter `invoiceable_type = shipper` and `invoiceable_id = auth id`
- Exclude `payout-using-wallet-balance` from the SaaS invoice list
- Create Viva `merchantTrns` with `source: shipper_react` so success can redirect to `{SHIPPER_PANEL_URL}/billing?payment=success`
- Do **not** insert `payment_transactions` at create-order time (avoids duplicates with webhook)
- Verify only marks paid when Viva `statusId = F` / mapped `success`
- `lockForUpdate` + existing `transaction_id` check for duplicates
- Wallet pay requires balance ≥ invoice total (legacy behaviour)
- Bank receipt: pdf/jpg/png max 5 MB, status `uploaded`

## Config

`SHIPPER_PANEL_URL` (default `http://localhost:5173`) in `config/app.php` as `shipper_panel_url`.

## Tests

`tests/Feature/Api/Shipper/Billing/BillingApiTest.php`

## Completion criteria

- [x] List/show/summary use real invoices
- [x] Viva create fails closed (no dummy checkout)
- [x] Verify does not mark paid on E/X/missing `t`
- [x] Duplicate verify does not double-insert transactions
