# Phase 5 – Viva Wallet Integration / Adaptation

**Owners:** Backend (settlement) + Frontend (redirect/return)

## Reused

- `VivaService::createOrder`
- `paymentSuccess` + `paymentWebhook` for merchant-configured success URL
- Status map `F/E/A/X/...`

## Adapted for React

1. `POST /billing/viva/create-order` `{ invoice_id }`
2. Backend builds the same merchant payload as `handlePaymentAddOn`, plus `source: shipper_react`
3. Frontend `window.location.assign(checkoutUrl)`
4. **Primary settlement** remains Viva → Laravel `payment-success?t=`
5. If `source=shipper_react`, redirect to `{SHIPPER_PANEL_URL}/billing?payment=success`
6. **Secondary:** if the SPA receives `?t=` (or `s` only), `POST /billing/viva/verify-payment`
   - Missing `t`: cancelled/timeout, invoice stays unpaid
   - Viva non-success: 422, unpaid
   - Success: settle with lock; second call returns `duplicate: true`

## Scenarios

| Case | Expected |
| --- | --- |
| Success F | Invoice paid, transaction row once |
| Fail E | Unpaid, error message |
| Cancel / no t | Unpaid |
| Timeout | Unpaid (no t) |
| Duplicate verify | No second payment / no second wallet withdraw |
| Already paid create-order | 422 |
| Receipt uploaded | Pay Now 422 / hidden in UI |
| Refresh during checkout | User returns via Viva URL; webhook or verify settles once |

Do not test live charges in CI; HTTP is faked. Manual demo checkout still uses Viva sandbox credentials.
