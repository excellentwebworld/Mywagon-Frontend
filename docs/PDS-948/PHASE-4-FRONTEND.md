# Phase 4 – Frontend Billing UI

**Owner:** Frontend developer  
**Depends on:** Phase 6 contract (can stub UI against it)

## Layout (prototype, minus removed items)

- Header + Export / Download Statement
- Universe banners (Services active, Loads coming soon)
- Tabs: SaaS & Fees | Credits & Adjustments | Statements & Exports
- **Not present:** Disputes, Managed Payments

## SaaS & Fees

- KPI cards from `GET /billing/summary` (not current page only)
- Overdue action bar
- Filters: All / Unpaid / Overdue / Paid / Subscription / Commission / Penalty
- Search (debounced) + pagination
- Row actions: Pay Now, wallet, bank transfer, PDF preview, CSV
- Drawer: line items + linked loads from `GET /billing/invoices/{id}`

## Credits

- Wallet balance
- Pay using wallet (full invoice only)
- Request adjustment → persisted `contact_us`
- Wallet movement table (legacy Rewards/All wallet rows)

## Statements

- CSV via `GET /billing/statements/export`
- Aging from summary
- PDF statement uses existing print preview (client-side)

## States

Loading, empty, API error, `account_statement` upgrade banner, past-due banner, under-process bank receipt.

## Files

`src/pages/Billing/**`, `src/api/services/billingService.ts`, `src/router.tsx` `/billing`, i18n `billingPage`.

Removed: DisputesTab, ManagedPaymentsTab, dispute modals, Record Payment (replaced by bank transfer).

## Completion criteria

- [x] No mock invoice fallback
- [x] Pay Now redirects to Viva checkout URL from API
- [x] Return `?t=` / `?payment=success` handled
