# Phase 6 – Frontend / Backend Integration (API contract)

Base: `/api/shipper/v1`  
Auth: Sanctum Bearer  
Envelope: `{ success, message, data, meta? }`

## GET /billing/summary

KPI + wallet + bank + aging + `has_account_statement` + `has_past_due`.

## GET /billing/invoices

Query: `status` = all\|unpaid\|paid\|overdue\|due_soon, `type` = subscription\|commission\|penalty\|add-on, `q`, `from`, `to`, `page`, `per_page`.

`data[]` item shape (frontend `Invoice`):

```
id, raw_id, type, sub, status (Paid|Unpaid|Overdue), iDate, dDate, pDate,
subt, tax, tot, cred, rem, loads, tags[], cur,
can_pay_now, can_pay_wallet, can_bank_transfer, under_process,
bank_transfer_admin_status, paid_using, line_items[]
```

`meta`: current_page, per_page, total, last_page

## GET /billing/invoices/{id}

Same object including `line_items`.

## POST /billing/invoices/{id}/pay-wallet

Full wallet settlement. 422 if insufficient or already paid.

## POST /billing/invoices/{id}/bank-receipt

multipart `receipt` file. Sets under process.

## GET /billing/credit-notes

Wallet synthetic `WALLET` row (`rem` = balance) plus movement history.

## POST /billing/apply-credit

`{ invoice_id }` → same as pay-wallet (legacy “pay using wallet”).

## POST /billing/request-adjustment

`{ invoice_id, amount, reason }` → `contact_us`.

## POST /billing/viva/create-order

`{ invoice_id }` → `{ orderCode, checkoutUrl, amount, invoice_id }`  
502 if Viva token/order fails (no simulation flag).

## POST /billing/viva/verify-payment

`{ transaction_id|t, order_code|s }`

## GET /billing/statements/export

`format=csv` streams CSV; `format=json` returns rows.

Frontend service: `src/api/services/billingService.ts`.
