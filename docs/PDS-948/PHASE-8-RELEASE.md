# Phase 8 – Regression and release

## Regression (must still work)

- Legacy Blade billing (`billingNew`) and `handlePaymentAddOn` / `paymentSuccess` for non-React `merchantTrns`
- Carrier/driver billing and offer payment links (shared `paymentSuccess`)
- Admin invoice / bank-transfer acceptance
- Subscription purchase Viva path (`plan_id` in merchantTrns)
- React modules other than Billing (router only adds `/billing`)

## Deploy

1. Deploy `MV_Backend_API` (no new migrations).
2. Set `SHIPPER_PANEL_URL` to the React origin.
3. Confirm Viva success URL still `payment-success` (merchant portal).
4. Deploy `shipper_react`.
5. Smoke: list invoices, Pay Now sandbox, wallet, bank upload.

## Changed files (high level)

**Backend:** Billing controllers/services, `VivaService`, `routes/api/shipper.php`, `config/app.php`, `SubscriptionController` (source + React redirect), tests.

**Frontend:** `src/pages/Billing/**`, `billingService.ts`, locales, docs under `docs/PDS-948/`.

## Sign-off

Feature is production-ready when Phase 7 automated tests pass and sandbox Pay Now has been verified once against demo Viva.
