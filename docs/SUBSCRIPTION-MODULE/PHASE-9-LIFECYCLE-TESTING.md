# Phase 9 — Subscription Lifecycle Testing

Positive path (manual + automated where possible):

1. New owner login → Essential assigned.
2. Overview shows Essential, usage, upgrade on Plus/Pro.
3. Quote Plus monthly (VAT if GR).
4. Checkout → Viva sandbox success → Plus active, invoice in Billing.
5. Buy count add-on → limit increases.
6. Buy status add-on → permission 1.
7. Upgrade Plus→Pro same month → prorated charge, same expire, add-ons re-synced.
8. Enable auto-pay on plan and add-on.
9. Cancel add-on → cancelled, still active until end.
10. Cancel plan → Plan Cancelled, access remains.
11. After expire (or test helper `expire-subscription-today`) without auto-pay → Essential.
12. Paid + auto-pay expire → renewed paid (sandbox recurring token).

Each transition: DB `user_subscriptions` count/soft-deletes, permissions, invoices, `payment_transactions`.
