# Phase 1 — Existing Subscription System Analysis

Inspected 14 Aug 2026 from live Laravel code. **No assumptions.** Prices and plan feature values are **database-driven**; named plans Essential / Plus / Pro appear in later migrations.

## 1. Architecture

The old Shipper Panel is a Blade page plus Viva Smart Checkout. There is **no** shipper JSON subscription API. Carrier/driver have separate Blade/web flows (`AppSubscriptionController`) sharing the same tables and `paymentSuccess`.

```
Shipper (owner or sub-user)
  └─ UserSubscription (morph userable = shipper)
        ├─ Subscription (catalog plan)
        ├─ UserSubscriptionPermission[] (copied from plan + add-on increments)
        └─ SubscriptionAddon[] (purchases; morph on userable, not always linked to current UserSubscription id)
```

Entitlements used by the rest of the panel come from `CommonHelper::getSubscription()` → `activeSubscription.userSubscriptionPermission`, not from the catalog row.

## 2. Plans (catalog)

Table: `subscriptions` (`type = shipper`, `status = 1` shown on the page).

| Field | Meaning |
| --- | --- |
| `name` | Translatable JSON (`english` / `greek`) |
| `price` | Monthly list price (string/decimal). `0` = free Essential |
| `price_yearly` | **Per-month** yearly rate. Charged amount = `price_yearly * 12` |
| `invoice_period` / `invoice_interval` | Catalog metadata; user cycle is `user_subscriptions.interval` |
| `status` | `1` active, `0` hidden |

Migrations and admin UI treat three English names: **Essential**, **Plus**, **Pro**. Plan **IDs are not stable across environments**; the Blade “upgrade vs current” check compares **numeric `subscription_id`**, which only works if plans were inserted Essential < Plus < Pro.

**Free / trial:** There is no separate trial SKU. Free = `price = 0` (Essential). Assigned:

- On shipper login if owner has no `activeSubscription` (`LoginController`).
- Daily cron `assign:free-subscription` after paid plan expiry when auto-pay is off or renewal fails.

Free rows still have `interval = month` and `expire_date = +1 month`. They are **not** “free forever”. The React mock (`Essential` / “Free forever”) does **not** match production.

**Monthly / yearly:** User chooses `period=month|year` at upgrade. Stored on `user_subscriptions.interval`. Yearly checkout amount = `price_yearly * 12`.

**Plan limits:** Stored per plan in `subscription_permissions.value`, copied to `user_subscription_permissions` at purchase/renewal. Count permissions are incremented when count add-ons are bought.

Documented **count** limits from migrations (verify in DB before coding UI copy):

| Permission slug | Essential | Plus | Pro |
| --- | --- | --- | --- |
| `private_load_limit` | 5 | 200 | 100000 (≥10000 treated as unlimited) |
| `public_load_limit` | 5 | 100 | 100000 (unlimited) |

Other counts (`partners`, `dispatcher_users`, `count_of_bids_per_month`, tracking links) are **admin/DB configured**, not hardcoded. Do not copy `mockData.ts` (e.g. Essential 1000 bids).

## 3. Feature permissions (shipper)

Seeded in `PermissionSeeder` (`guard_name = shipper`, `type` not null). Enforcement: `CommonHelper::checkSubscriptionPermission($slug)` and API traits (`ChecksPartnersAccess`, etc.).

| Slug | Type | Typical gate |
| --- | --- | --- |
| `private_loads` | status | Create private shipment |
| `public_loads` | status | Create public shipment |
| `draft_shipment` | status | Save draft |
| `search_available_trucks` | status | SAT module |
| `partners` | count | Partner invite/accept vs accepted partner count |
| `send_tracking_links_to_your_customers_per_month` | count | Tracking emails in current cycle |
| `dispatcher_users` | count | Sub-user seats (`ShipperSeatLifecycleService`) |
| `private_load_limit` | count | Non-draft/cancelled private loads in cycle; ≥10000 = unlimited |
| `public_load_limit` | count | Same for public |
| `live_gps_shipment_tracking` | status | GPS |
| `chat_with_carriers_drivers` | status | Chat |
| `view_electronic_pods` | status | POD images |
| `view_map` | status | Maps |
| `allow_multiple_stops` | status | Multi-stop |
| `count_of_bids_per_month` | count | Bids in cycle |
| `view_if_public_bids_have_been_submitted_for_a_posted_truck` | status | Bids-received UI |
| `view_current_best_bid_for_a_posted_truck` | status | Best bid UI |
| `profile_management` | status | Profile |
| `account_statement` | status | Billing/statement |
| `notifications` | status | Notifications |
| `manage_shipment` | status | Manage shipments |
| `feedback_and_support` | status | Support |
| `subscription_module` | status | Subscription page (web permission middleware) |
| `manage_address_book_master` | status | Address book |
| `manage_product_master` | status | Product master |
| `manage_erp_orders` | status | ERP |
| `create_shipment_from_search_available_truck` | status | Bid → create |
| `view_matched_trucks_for_availability` | status | Match view |
| `filter_and_search_in_all_the_modules` | status | Filters |
| `fee_per_completed_shipments` | percentage | SaaS fee |
| `disabled_ads` | status | Ads (add-on commented out in seeder) |
| `penalty_for_canceling_shipment` | percentage | Cancel penalty |
| `rating_and_review_for_transporter` | status | Ratings |
| `actual_travelled_route` | status | GPS path |
| `ai_suggested_price` | status | Plus/Pro included; Essential via add-on |

Missing from catalog but used in gates: `user_management` appears in feature mapping; confirm in DB.

## 4. Current subscription on Dashboard

`DashboardController` loads the **latest** `UserSubscription` for the shipper (including expired, `orderBy id desc`), not strictly `active()`. Used for display. Feature buttons still use `checkSubscriptionPermission` against `activeSubscription()` (`expire_date >= today`).

## 5. User subscription record

`user_subscriptions`:

| Column | Role |
| --- | --- |
| `userable_type/id` | Morph (`shipper`) |
| `subscription_id` | Catalog plan |
| `price` | Amount stored at purchase (often **charged** amount, not list price — webhook uses Viva `amount`) |
| `recurring_payment` | `0/1` auto-renew |
| `interval` | `month` / `year` |
| `start_date` / `expire_date` | Cycle. Accessor forces expire to end of day |
| `status` | `1` active, `0` expired (hourly cron) |
| `vat_tax` / `vat_tax_amount` | Snapshot |
| `is_cancelled` / `cancelled_at` | Cancel auto-renew; access until `expire_date` |
| `is_custom` | Admin custom plan; skip some permission syncs |
| `deleted_at` | Soft delete. **Upgrade soft-deletes all prior rows** then inserts a new one |

`Shipper::activeSubscription()` = morphOne `UserSubscription` scoped `active()` = `expire_date >= now()`, latest id.

**Sub-users:** `getShipperId()` uses parent. Subscription rows belong to the **company owner**, not the sub-user.

## 6. Activation / purchase / upgrade

### 6.1 Quote (`POST shipper/subscription/calculate-payment`)

Inputs: `subscription_id`, `period` (`month`|`year`).

1. Base = monthly `price` or `price_yearly * 12`.
2. If there is an **active paid** plan (`price > 0`, `status=1`, not expired) **and** `current.interval == period`:
   - `remaining_days` from expire vs now.
   - `total_days` = days in current month (monthly) or 365 (yearly).
   - `usedDays = total_days - remaining_days` (min 0).
   - Payable = `newAmount - (usedDays / total_days) * newAmount`  
     i.e. charge the **unused fraction of the NEW plan price**, not a credit of the old plan price.
3. If intervals differ (month↔year), **no proration** (year→month wallet credit is commented out).
4. VAT: if shipper country is Greece (`checkShipperCountryDominance`), `config('app.vat_tax')` (typically 24%) on the payable subtotal.

### 6.2 Checkout (`GET shipper/subscription/payment/handle/{subscription_id}?period=&auto_pay=&vat_tax_amount=`)

- If payable > 0: Viva order, `amount = (subtotal + VAT) * 100` cents, `allowRecurring` if `auto_pay=1`, timeout **300s**, `merchantTrns` JSON (`plan_id`, `plan_period`, `user_id`, `user_type=shipper`, VAT, totals). Redirect Smart Checkout.
- If payable ≤ 0: skip Viva, **soft-delete all** shipper subscriptions, create new row + copy plan permissions, `AddonPurchaseService::syncUserSubscriptionWithSubscriptionAddon`.

**Upgrade button visibility (Blade):** shown only if target `price > 0`, current interval is **not year**, and `current.subscription_id < target.id`. Same-plan / lower-id / yearly subscribers cannot self-upgrade in UI.

`SubscriptionUpgradeService` (admin): yearly → **no** eligible upgrades; monthly → all other paying plans. Recurring is forced off on admin upgrade.

There is **no user-facing downgrade**. Moving to Essential happens by: cancel + expiry, failed auto-renew, or cron `assignFreePlan`.

### 6.3 Payment success (`GET/POST /payment-success?t=`)

1. Fetch Viva transaction (`paymentWebhook`).
2. If `merchantTrns.is_addon` → `AddonPurchaseService::handle`.
3. Else if offer payment link → mark paid.
4. Else plan:
   - Soft-delete all `UserSubscription` for that userable.
   - Create new row. If previous paid plan same interval: **keep old start/expire** (mid-cycle upgrade keeps billing date). Else start=now, expire=+1 month/year.
   - Copy plan permissions; sync add-ons into permission values.
   - Invoice `slug=subscription`, `status=paid`, `paid_using=fully_viva`, AADE submit.
   - `PaymentHistory` + `PaymentReceiptNotification` (SMS if no email).
   - If `plan_auto_pay=1`, store `auto_pay_transaction_id` on Shipper for later recurring charges.
   - Redirect `shipper.subscription.plan`.

**Failed / cancel:** `payment-failed`. Does not mutate subscription. Session `shipper_initiated_payment` decides return URL.

## 7. Auto-renewal

Two implementations exist:

| Path | Used? |
| --- | --- |
| `assign:free-subscription` daily 00:05 — `renewPlan()` via `VivaService::transactionsPayment` using `shipper.auto_pay_transaction_id` | **Yes (Kernel)** |
| `SubscriptionController::recurringPayment` using last `PaymentTransaction` | **Not scheduled** (legacy) |

`renewPlan` (inspected):

1. Select `UserSubscription` whose userable **has no `activeSubscription`** (expired) and user is owner (no `shipper_id`).
2. If `recurring_payment == 1`:
   - No `auto_pay_transaction_id` or plan inactive → **assign Essential**.
   - Charge **monthly list `price * 100` only** (yearly interval still uses monthly `price` in payload — **bug vs stored yearly price**).
   - Success: new `UserSubscription` (does **not** soft-delete old), copy permissions, sync add-ons, invoice, notify.
   - Failure: `assignFreePlan` (new Essential row if no later-dated subscription exists).
3. If `recurring_payment != 1`: `replicateFreePlan` / `assignFreePlan`.

Hourly `expired:subscription` sets `status=0` when `expire_date < today` and `status=1`.

**No payment retry queue. No grace period** beyond remaining days until `expire_date` after cancel.

## 8. Cancellation

`POST shipper/cancel/plan` `{ plan_id }`:

- Sets `recurring_payment=0`, `is_cancelled=1`, `cancelled_at=now`.
- Does **not** expire immediately. Access continues until `expire_date`.
- Blade hides Cancel on free (`price=0`) and when already cancelled (`Plan Cancelled`).

Add-on cancel is separate (`addon-purchase-cancel`).

## 9. Failed payment / pending / timeout

- Checkout timeout 300s. No `t` on fail → generic fail page.
- Viva `statusId` mapped in webhook (`F` success, `A` pending, `E` fail, etc.).
- Pending does **not** create a subscription.
- Duplicate `payment-success` **creates another `PaymentTransaction` and can soft-delete/recreate subscription again** — **not idempotent**. SPA must fix this.

## 10. History / invoices / payment method

- Subscription page does **not** list payment history. That is **Billing** (`billingNew`, now PDS-948 APIs).
- Invoices: `invoices.slug` = `subscription` | `add-on`.
- Card is not stored in-app; Viva recurring uses `auto_pay_transaction_id`.
- Wallet can pay **invoices**, not the initial Smart Checkout (checkout disables wallet/cash).

## 11. Web / admin endpoints (old)

Auth: shipper session. Subscription page: `web.shipper.permission`. Invoice download bypasses past-due middleware.

| Method | Route name | Purpose |
| --- | --- | --- |
| GET | `shipper.subscription.plan` | Plan + add-on page |
| GET | `shipper.subscription.billing` | Billing (PDS-948) |
| POST | `shipper.subscription.auto-pay` | Toggle plan recurring |
| GET | `shipper.subscription.payment.handle` | Start Viva plan checkout |
| POST | `shipper.subscription.calculate-payment` | Quote JSON |
| GET | `shipper.subscription.recurring-payment` | Legacy renew (unscheduled) |
| ANY | `shipper.subscription.payment.webhook` | Thin wrapper; success uses same method |
| POST | `shipper.subscription.contact-us` | Add-on contact (`type=add_on`) |
| GET | `shipper.subscription.invoice` | Invoice HTML |
| POST | `shipper.subscription.get-addon-price` | Add-on quote HTML+JSON |
| POST | `shipper.subscription.addon-purchase-confirm` | Viva add-on checkout |
| POST | `shipper.subscription.addon-purchase-cancel` | Cancel add-on |
| POST | `shipper.subscription.enable.auto.pay.addon` | Toggle add-on auto-pay |
| POST | `shipper.cancel.plan` | Cancel plan auto-renew |
| ANY | `shipper.subscription.payment.success` | Public Viva return |
| ANY | `shipper.subscription.payment.failed` | Public Viva fail |

Admin: CRUD plans, addon prices, assign subscription on shipper management, sync permissions.

## 12. Database

```
subscriptions 1──* subscription_permissions *──1 permissions
user_subscriptions *──1 subscriptions
user_subscriptions 1──* user_subscription_permissions *──1 permissions
addons 1──* addon_price *──1 subscriptions   (price per plan)
subscription_addons *── morph userable (Shipper)
payment_transactions (optional user_subscriptions_id)
invoices / invoice_details (subscription_id nullable; slug)
payment_histories
shippers.auto_pay, auto_pay_transaction_id
```

Indexes: morph indexes on `userable`; no unique on Viva `transaction_id` (duplicate risk).

**Migrations:** do not add tables for SPA unless idempotency needs a unique `payment_transactions.transaction_id`. Prefer application-level lock + unique index.

## 13. Cron / queue

| Schedule | Command | Effect |
| --- | --- | --- |
| Hourly | `expired:subscription` | `status=0` on expired active rows |
| Daily 00:05 | `assign:free-subscription` | Renew or assign Essential |
| Daily 00:30 | `handle:addon-purchase` | Expire/renew add-ons |
| Job | `SyncHubspotContactJob` | On subscription/addon observer |

`assignFreePlanToUsersWithoutSubscription()` is **commented out** in `handle()`.

## 14. Notifications / HubSpot

| Class | When |
| --- | --- |
| `PaymentReceiptNotification` | Paid plan or add-on invoice |
| `FreeSubscriptionAssignedNotification` | Cron free assign |
| `DowngradedToFreePlanNotification` | Downgrade sync |
| `DowngradedToLowerPlanNotification` | Lower plan |
| `SubscriptionAssignedNotification` | Admin assign |
| `InvoiceCreated` | Invoice created |
| `SubscriptionUpgradedMail` | Admin `SubscriptionUpgradeService` |
| SMS | Receipt URL if no email (Greek locale) |

Observers: `SubscriptionObserver`, `SubscriptionAddonObserver` → HubSpot.

## 15. Access control

- Web: shipper auth + menu permission `subscription_module`.
- Sub-user: parent entitlements.
- API modules already return 403 + `upgrade_url` (today Laravel plan URL; SPA should use `/subscription`).
- `web.ShipperPastDueInvoice` / `api.shipper.past-due`: unpaid due invoices redirect to **Billing**, not Subscription.
- Driver/carrier `Subscription` middleware is not used on shipper web.

## 16. Business rules (verified)

| Question | Actual behavior |
| --- | --- |
| When does a paid plan become active? | After Viva success (or zero-amount path). Not on order create. |
| Payment fail | No subscription change. |
| Expire | Hourly `status=0`; daily cron assigns Essential unless auto-pay succeeds. |
| Auto-pay on | `recurring_payment=1` + Viva recurring token on shipper. |
| Auto-pay off / cancel | Access until period end, then Essential. |
| Upgrade same cycle | Prorate **new** price by unused days; keep expire date. |
| Upgrade month→year | Full yearly charge; new cycle from today. Yearly users cannot upgrade in UI. |
| Same plan again | UI hides button; API does not uniquely forbid. |
| Active paid + buy another | Soft-delete previous rows; one logical current row. |
| Add-ons on upgrade | `syncUserSubscriptionWithSubscriptionAddon` **adds** remaining non-expired addon counts onto **new plan base values** (can stack). |
| Add-ons on expire | Daily: auto-pay renews or `status=0` and reverse permission (if reverse is called). Cancel sets `is_cancelled` but **does not** reverse permission until expiry handler. |
| Multiple add-ons | Yes. Same slug can be purchased again; count types **add**. |
| Status add-on twice | Sets permission `value=1` again (duplicate purchase still charged). |
| Pending payment | No row. |
| Duplicate webhook | **Not guarded** — must fix for SPA. |
| Frontend retry | Second success can duplicate invoices/subscriptions. |
| Webhook delayed | Subscription stays old until success runs. |
| Custom plans | `is_custom`; admin-managed; skip some syncs. |

## 17. Known defects to preserve-or-fix (document for Phase 3)

Must **preserve business outcome**; may fix safety:

1. Payment webhook not idempotent.
2. `AddonPurchaseService::handle` always redirects to **shipper** URL even for carrier/driver.
3. `subscription_addons.user_subscription_id` stored as `0` on purchase.
4. Yearly auto-renew payload uses monthly `price`.
5. Blade upgrade uses plan **id** ordering.
6. Duplicate add-on names sharing `live_gps_shipment_tracking` in `AddonSeeder` (Tracking Links vs GPS).
7. `UserSubscription::scopeActive` has dead returns after first `whereDate`.
8. `autoPay` JSON always `status: true` even when plan missing (second return unreachable).
9. `recurringPayment()` looks unused and references `$recurring_subscription_plan->id` inside foreach (bug).

## 18. What to reuse vs replace

Reuse: tables, permission engine, Viva, invoice slugs, crons, notifications, `AddonPurchaseService` core, `calculatePayment` math.

Replace for SPA: Blade HTML, session flashes, HTML quote fragments, redirect-only checkout without JSON `checkoutUrl`, Laravel `upgrade_url` in 403s → `/subscription`.
