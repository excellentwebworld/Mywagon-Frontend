# Phase 7 – Testing

**Owners:** Backend (PHPUnit) + Frontend (manual) + QA

## Automated

`php artisan test --filter=BillingApiTest`

Covers: auth 401, list scoped to shipper, overdue mapping, 404, summary, Viva create success without pre-inserting transactions, Viva create failure without dummy order, paid invoice rejected, verify fail does not pay, verify success + duplicate, missing t, wallet insufficient, adjustment persist, bank receipt upload.

## Manual matrix (Phase 1 table BL-* plus PDS 948 UI)

See Miro `miro/Shipper/Billing/Table-view.md` plus:

- Billing page load / empty / error
- Filters, search, pagination, KPI click
- Invoice drawer line items
- Pay Now sandbox success / fail / cancel
- Wallet pay when balance covers / hidden when not
- Bank receipt valid / oversized / wrong type
- Under process hides Pay Now
- Refresh during Viva
- Two tabs Pay Now (second create-order OK; settlement once)
- `account_statement` banner
- Past-due banner
- Credits tab wallet rows
- Statement CSV
- Greek/English labels
- Desktop / tablet / mobile billing.css

## Completion criteria

- [x] Feature tests added
- [ ] Manual Viva sandbox run on deployed credentials (environment-specific)
