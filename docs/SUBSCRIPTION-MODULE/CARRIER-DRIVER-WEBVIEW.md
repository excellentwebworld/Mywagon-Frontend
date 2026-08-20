# Carrier & Driver Subscription — WebView + shipper_react

See backend copy: `MV_Backend_API/docs/CARRIER-DRIVER-WEBVIEW.md`

## Quick reference

- **URLs:** `/webview/carrier/subscription?user_id={encrypted}&lang=el`
- **API:** `/api/carrier/webview/subscription/*` and `/api/driver/webview/subscription/*`
- **Auth:** encrypted `user_id` (no Bearer token, no mobile app changes)
- **Payment sources:** `carrier_react`, `driver_react`

## Phases

0. Discovery & parity (this doc)
1. Backend services (Carrier/Driver subscription + payment)
2. WebView JSON APIs + middleware
3. Payment return (Viva → React with user_id)
4. shipper_react WebView shell
5. Role-aware SubscriptionPage
6. Update `getSubscriptionUrlAttribute()` (backend only)
7. QA & rollout
