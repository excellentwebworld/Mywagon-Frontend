# Phase 1B — Shipper Add-on Catalog

Source: `AddonSeeder`, later migrations, `addon_price.type`, Blade `planWithAddons`, `AddonPurchaseService`. **Live prices are per-plan in `addon_price`** (admin-editable). Seed/migration numbers below are defaults, not production guarantees.

Add-ons only render if the shipper has an `activeSubscription` and a matching `addon_price` row for **that plan id**. Zero `monthly_price` rows are hidden.

Purchase **requires** an active `user_subscription` id in the checkout payload. Independent purchase without a subscription is not supported in the old UI (`planWithAddons` empty).

## Billing types

| `addon_price.type` | UI section | Auto-pay | Dates |
| --- | --- | --- | --- |
| `recurring` | Recurring Add-On Features | Optional checkbox (default on) | `start_date` now, `end_date` +1 or +12 months |
| `one_time` | 1-Time Add-On Features | No | Still writes start/end like recurring in `createSubscriptionAddon` |

Count add-ons (`addons.type = count`) show a quantity input. Status add-ons (`status`) quantity defaults to 1 and set permission `value = 1`.

Charge:

- Monthly interval: `monthly_price * count` (+ VAT).
- Yearly interval: `yearly_price * count * 12` (+ VAT).
- Quote UI does **not** prorate remaining subscription days (proration code is commented out). Full period is charged.

VAT: Greece domicile → `config('app.vat_tax')`.

After pay: increment or create `user_subscription_permissions`; create `subscription_addons`; invoice `slug=add-on`; receipt notification; `syncUpgradeAndDowngradeSubscription` (shipper → seat lifecycle).

Cancel: `is_cancelled=1` immediately. Permission **not** reversed until `handle:addon-purchase` on `end_date` (and `reverseUserSubscriptionPermission` is skipped on cancel itself). Access continues until period end.

Renewal (`handle:addon-purchase` daily): if `status=1`, `end_date < today`, `is_cancelled=0`, `auto_pay=1` → Viva recurring on `auto_pay_transaction_id`. Success: mark old `status=0`, replicate new row. Fail: expire + reverse permission.

## Catalog (shipper only)

### Recurring (typical)

| Name | Slug | Addon type | Purpose | Default seed/migration price | Plan dependency |
| --- | --- | --- | --- | --- | --- |
| Partners | `partners` | count | Extra partner slots (+`addon_count` to permission) | Seeder placeholder 80/83 | Priced per plan; still sold if plan already includes a base count |
| Dispatcher User | `dispatcher_users` | count | Extra seats | placeholder | Enforced via `ShipperSeatLifecycleService` after purchase |
| GPS Tracking | `live_gps_shipment_tracking` | status | Unlock GPS | placeholder | If plan already has GPS, buying again still charges; value stays 1 |
| View PODs | `view_electronic_pods` | status | Electronic PODs | placeholder | Same |
| Allow Multiple Stop | `allow_multiple_stops` | status | Multi-stop | placeholder | Same |
| View If Posted Truck Received Bids | `view_if_public_bids_have_been_submitted_for_a_posted_truck` | status | SAT bids-received | placeholder | Same |
| View Best Bids on Posted Trucks | `view_current_best_bid_for_a_posted_truck` | status | Best bid | placeholder | Same |
| View Matched Loads for Availability | `view_matched_trucks_for_availability` | status | Match view | placeholder | Same |
| AI Suggested Price | `ai_suggested_price` | status | AI price | **€4.99** recurring (migration) | Permission **included on Plus/Pro**; Essential buys add-on |
| Actual driven / travelled route | `actual_travelled_route` | status | GPS path on completed trip | **€9.99** (migration; yearly_price same as monthly in migration) | Sold for all shipper plans that have a price row |

### One-time (typical)

| Name | Slug | Addon type | Purpose | Default price | Notes |
| --- | --- | --- | --- | --- | --- |
| Bids (Per Unit) | `count_of_bids_per_month` | count | Extra bids this cycle | placeholder / mock €0.99 | Adds to permission value; cycle window is subscription start–expire |
| Private Load Limit | `private_load_limit` | count | Extra private loads | **€0.99** one_time | Migration placeholder |
| Public Load Limit | `public_load_limit` | count | Extra public loads | **€3.00** one_time | Migration |

### Ambiguous / broken seed rows

| Name in AddonSeeder | Slug | Issue |
| --- | --- | --- |
| Tracking Links for Receivers | `live_gps_shipment_tracking` | **Same slug as GPS Tracking**. Tracking-link **permission** is `send_tracking_links_to_your_customers_per_month`. Do not invent a second GPS add-on in UI; load distinct `addons.id` from DB. Confirm production rows before mapping React `extraTrackingLinks`. |
| Disabled Ads | `disabled_ads` | Commented out of seeder |

React mock extra “Tracking Links” / “Bids” / “Private Loads” one-time packs **must be bound to real `addon_price` ids**, not hardcoded.

## Frontend (old)

- Lists: monthly and yearly columns on the same Blade page; add-on displayed price follows the **billing preference toggle**, but checkout `subscription_interval` is the **current plan interval** (`data-current-plan-interval`).
- Modal: HTML table from `getAddonPrice`; Pay Now posts to `addon-purchase-confirm`.
- Purchased grid: `end_date >= today`, cards with count, total, dates, status (Active / Expired / Cancelled), Auto Pay Yes/No, Cancel.
- Contact Us modal for custom add-on requests (`type=add_on`).

## APIs (old)

| Route | Body |
| --- | --- |
| POST `get-addon-price` | `addon_id` (addon_price id), `plan_interval`, `addon_type`, `is_recurring` |
| POST `addon-purchase-confirm` | `addon_price_id`, `active_subscription_id`, `purchase_addon_slug`, `addon_count`, `add_on_auto_pay`, `subscription_interval` |
| POST `addon-purchase-cancel` | `addon_id` (subscription_addons id) |
| POST `enable-auto-pay-addon` | `addon_id` |

## Edge cases

- Add-on without active plan: UI empty; `findOrFail` on subscription if API called.
- Add-on not priced for current plan: not listed.
- Status add-on already in plan: still purchasable if price > 0.
- Count stacking: multiple purchases add. Cancelled add-on still counted in `syncUserSubscriptionWithSubscriptionAddon` because sync uses `notExpired()` **without** excluding cancelled.
- Plan change: remaining add-ons re-applied on top of **new plan defaults**.
- Subscription expire with active add-ons: add-on cron is independent; permissions re-synced onto Essential if still `notExpired`.
- `user_subscription_id = 0` on create: purchased add-ons are keyed by userable morph, not FK to current plan row.
- Duplicate Viva success: second `handle()` creates another addon + invoice.

## Notifications / invoices

Same `PaymentReceiptNotification` + AADE as plans. Billing SPA already shows `Add-on` invoice type.

## Implementation rule

SPA must list add-ons from API (`guard_name=shipper`, price for current `subscription_id`, `monthly_price > 0`), split by `addon_price.type`. Do not hardcode the React mock list.
