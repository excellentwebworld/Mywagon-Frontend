# Carrier & Driver Subscription / Billing — WebView + shipper_react

See backend copy: `MV_Backend_API/docs/CARRIER-DRIVER-WEBVIEW.md`

## Quick reference

### Subscription

- **URLs:** `/webview/carrier/subscription?user_id={encrypted}&lang=el`
- **API:** `/api/carrier/webview/subscription/*` and `/api/driver/webview/subscription/*`
- **Auth:** encrypted `user_id` (no Bearer token, no mobile app changes)
- **Payment sources:** `carrier_react`, `driver_react`
- **Parity:** same upgrade/VAT/proration/usage rules as Blade + shipper React (see backend doc)

### Billing

- **URLs:** `/webview/carrier/billing?user_id={encrypted}&lang=el`
- **API:** `/api/carrier/webview/billing/*` and `/api/driver/webview/billing/*`
- **Auth:** encrypted `user_id` only (same as subscription WebView)
- **UI:** `WebViewBillingPage` → `BillingPage` with injected `createWebViewBillingService`
- **Links:** Subscription “View Invoices” ↔ billing ↔ subscription with `user_id`
- **Flag:** backend `BILLING_WEBVIEW_ENABLED` (default on) switches mobile `billing_url` to React

## Phases

0. Discovery & parity (this doc)
1. Backend services (Carrier/Driver subscription + payment)
2. WebView JSON APIs + middleware
3. Payment return (Viva → React with user_id)
4. shipper_react WebView shell
5. Role-aware SubscriptionPage
6. Update `getSubscriptionUrlAttribute()` (backend only)
7. QA & rollout
8. Billing WebView (shared BillingPage + WebView APIs + `billing_url` cutover) — done
