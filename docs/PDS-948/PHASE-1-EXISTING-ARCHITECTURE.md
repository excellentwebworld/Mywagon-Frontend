# Phase 1 – Existing Billing and Viva Wallet Architecture

**Status:** Complete (inspected from live code, not assumed)  
**Owners:** Backend lead + Frontend lead  
**Completion:** Existing tables, routes, payment paths, and permissions documented below.

## Old Shipper Panel (Blade)

- Route: `GET shipper/subscription/billing` → `SubscriptionController::billingNew`
- View: `resources/views/shipper/subscription/billing_new.blade.php`
- Permission: `account_statement` (upgrade modal). Date filter: `filter_and_search_in_all_the_modules`.
- Past-due: `$shipper->pastdueInvoices()` banner; middleware `web.ShipperPastDueInvoice` can block the rest of the panel.

### Data shown

Invoices with `invoiceable_type = 'shipper'` (morph map alias, **not** `App\Models\Shipper` FQCN), `total > 0`.

- Paid: `status = paid`
- Pending: `status = unpaid` and `issue_date <= today`
- Wallet movements from Bavix `transactions()` (Rewards / All tabs). Rows matching “Invoice Payout using wallet balance” are hidden from the mixed list.

### Actions (pending invoices)

Built by `CommonHelper::getBankTransferWithDownloadAndViewButton`:

| Action | Behaviour |
| --- | --- |
| Pay Now | `GET shipper/add-on/payment/handle/{invoice_id}` → `handlePaymentAddOn` |
| Pay using wallet | `GET shipper/invoice/paid/wallet/{invoice_id}` when balance ≥ total |
| Bank transfer | Upload receipt → `storeBankTransferReceipt` sets `bank_transfer_admin_status = uploaded`. Pay Now hidden while `uploaded`. |
| View invoice | `GET shipper/subscription/invoice/{id}` Blade print page |

Shippers **cannot** self-mark an invoice paid via a “record payment” form. Admin accepts/rejects bank receipts.

## Database (invoices)

Created in `database/migrations/2024_01_09_084254_create_invoices_table.php` plus later columns:

- `status`: `paid` / `unpaid` (constants on `Invoice`)
- `slug`: subscription, commission, penalty, add-on, commission-with-penalty, payout-using-wallet-balance, …
- `total`, `sub_total`, `vat_tax`, `vat_tax_amount`
- `issue_date`, `due_date`, `paid_at`, `paid_using`, `used_wallet_amount`
- `bank_transfer_admin_status`: uploaded / accepted / rejected
- `reference_id`
- **No `remaining_amount` column on invoices** (that field lives on unrelated promo tables). Remaining for unpaid invoices is the invoice `total`.

`invoice_details`: description, totals, optional `shipment_id`.

`payment_transactions`: created **after** Viva transaction lookup in `paymentWebhook`, not when the order code is created.

`payment_histories`: `user_id`, `reference_id`, `payment_id`, `payment_status` enum (`pending|success|failed`), `type`, `payment_response`.

## Viva Wallet (existing)

Service: `App\Services\VivaService`

- OAuth token: `POST connect_token_api_url` with Smart Checkout client id/secret
- Create order: `POST order_api_url`, amount in **cents**
- Checkout: `checkout_api_url?ref={orderCode}&color=1F1F41`
- Transaction lookup: `GET transaction_api_url/{transactionId}` with Bearer token

Status map: `F` success, `A` pending, `C` captured, `E` unsuccess, `R` refunded, `X` cancelled, `M`/`MA`/`MI`/`ML`/`MW`/`MS` dispute-related (Viva card disputes — **not** a shipper “open dispute” feature).

### Invoice Pay Now sequence

1. `handlePaymentAddOn` loads invoice for authenticated shipper.
2. If wallet covers **full** total, withdraw wallet and mark paid (`paid_using = wallet_balance`), create payout invoice slug `payout-using-wallet-balance`, notify, AADE, redirect.
3. Else charge `total - wallet` (wallet deducted only **after** success).
4. `merchantTrns` JSON: `{ invoice_id, user_id, user_type: shipper }`.
5. Redirect browser to Viva Smart Checkout (`paymentTimeout` 300s).
6. Viva success URL: `GET/ANY payment-success` (`SubscriptionController::paymentSuccess`).
7. Query `t` = transaction id. Controller gets token, calls `paymentWebhook`.
8. `paymentWebhook` GETs Viva transaction, decodes `merchantTrns`, inserts `payment_transactions`, returns status.
9. If `invoice_id` present and Viva success: optional wallet remainder withdraw, mark invoice `paid`, `paid_using` `fully_viva` or `viva_and_wallet`, notify, AADE, redirect (legacy: subscription plan).

No `t` (timeout/cancel): failed view; offer payment links may expire via `s` order code.

Recurring / add-on / offer-link paths share the same `paymentSuccess` entry and branch on `merchantTrns`.

## Frontend React (before this phase)

A UI conversion existed under `src/pages/Billing` with mock data, dummy Viva orders, fake credit notes, and `invoiceable_type = Shipper::class` queries that would return **no production invoices**.

## Completion criteria

- [x] Blade billing, invoice model, wallet, bank transfer, and Viva callback inspected in source
- [x] Morph type `'shipper'` confirmed
- [x] No remaining_amount on invoices confirmed
- [x] PaymentTransaction created at webhook, not at order create
