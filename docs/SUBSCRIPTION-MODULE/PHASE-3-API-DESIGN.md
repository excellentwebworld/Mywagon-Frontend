# Phase 3 — Backend / API Design

Prefix: `/api/shipper/v1/subscription`  
Auth: existing shipper Sanctum/token stack (same as billing).  
Owner context: `CommonHelper::getShipperId()` / parent shipper.  
Past-due: same `api.shipper.past-due` as other shipper APIs (may block except if we whitelist quote/checkout like billing). **Decision:** whitelist `subscription/*` the same way billing pay is allowed if past-due already forces Billing; if middleware blocks all, users with overdue invoices cannot upgrade — match old panel (past-due redirects to billing, subscription page still reachable from billing nav). Prefer: **allow GET overview** so they can see plan; **allow checkout only if product agrees**; default = follow `ApiShipperPastDueInvoice` as billing does.

Do **not** duplicate `AddonPurchaseService` math. Extract shared PHP services used by Blade and API.

Reuse Viva: `VivaService` + PDS-948 pattern `merchantTrns.source = shipper_react` and `SHIPPER_PANEL_URL` return (`/subscription?t=&s=`).

## 1. Reuse (no new business logic)

| Existing | Reuse as |
| --- | --- |
| `calculatePayment` | Quote service |
| `handlePayment` + `paymentSuccess` | Checkout + verify (idempotent wrapper) |
| `autoPay`, `cancelPlan` | Toggles |
| `getAddonPrice` (JSON fields only) | Add-on quote |
| `AddonController` + `AddonPurchaseService` | Add-on checkout/cancel/auto-pay |
| `CommonHelper::getSubscription` | Entitlements + usage |
| Crons | Unchanged |
| Billing invoice APIs | History |

## 2. Modify

| Item | Change |
| --- | --- |
| `paymentSuccess` / `verifyVivaPayment` | If `merchantTrns.source=shipper_react` and type plan/addon, activate then redirect SPA. **Idempotent** on `transaction_id`. |
| Module 403 `upgrade_url` | `/subscription` instead of Laravel route when `Accept: application/json` |
| `AddonPurchaseService::handle` redirect | Honor user_type + SPA source |

## 3. New JSON APIs

All success envelopes match shipper API: `{ status, message, data }`. Errors: 401 / 403 / 404 / 409 / 422.

### 3.1 GET `/subscription`

Current plan, catalog, add-ons, purchased, usage, VAT flag.

**data**

```json
{
  "vat_applies": true,
  "vat_percent": 24,
  "auto_pay_available": true,
  "current": {
    "user_subscription_id": 10,
    "plan_id": 2,
    "plan_name": "Plus",
    "price_charged": 550,
    "list_monthly": 550,
    "list_yearly_monthly_rate": 500,
    "interval": "month",
    "status": "active",
    "is_cancelled": false,
    "is_custom": false,
    "is_free": false,
    "recurring_payment": true,
    "start_date": "2026-08-01",
    "expire_date": "2026-08-31",
    "days_left": 17,
    "can_cancel": true,
    "can_upgrade": true
  },
  "usage": [
    { "slug": "private_load_limit", "used": 3, "limit": 5, "unlimited": false },
    { "slug": "partners", "used": 2, "limit": 3, "unlimited": false },
    { "slug": "dispatcher_users", "used": 1, "limit": 1, "unlimited": false },
    { "slug": "count_of_bids_per_month", "used": 12, "limit": 200, "unlimited": false },
    { "slug": "send_tracking_links_to_your_customers_per_month", "used": 1, "limit": 5, "unlimited": false },
    { "slug": "public_load_limit", "used": 0, "limit": 100, "unlimited": false }
  ],
  "plans": [
    {
      "id": 1,
      "name": "Essential",
      "description": "",
      "price_monthly": 0,
      "price_yearly_monthly_rate": 0,
      "is_free": true,
      "is_current": true,
      "upgrade_available_monthly": false,
      "upgrade_available_yearly": false,
      "permissions": [
        { "slug": "private_load_limit", "type": "count", "value": "5", "included": true }
      ]
    }
  ],
  "addons": {
    "recurring": [
      {
        "addon_id": 1,
        "addon_price_id": 44,
        "slug": "dispatcher_users",
        "name": "Dispatcher User",
        "type": "count",
        "billing_type": "recurring",
        "monthly_price": 33,
        "yearly_price": 33,
        "included_in_plan": false
      }
    ],
    "one_time": []
  },
  "purchased_addons": [
    {
      "id": 9,
      "slug": "dispatcher_users",
      "name": "Dispatcher User",
      "count": 1,
      "price": 33,
      "total": 40.92,
      "interval": "month",
      "start_date": "2026-08-01",
      "end_date": "2026-08-31",
      "status": 1,
      "is_cancelled": false,
      "auto_pay": true,
      "billing_type": "recurring"
    }
  ]
}
```

Upgrade availability: port Blade rules (not yearly current; target paying; treat plan order by **price** not id).

### 3.2 POST `/subscription/quote`

Body: `{ "plan_id": 2, "period": "month" }`  
Response: same numbers as `calculatePayment` plus raw floats:

```json
{
  "subtotal": 412.5,
  "vat_percent": 24,
  "vat_amount": 99.0,
  "total": 511.5,
  "currency": "EUR",
  "prorated": true,
  "keeps_expire_date": true
}
```

422 if plan missing / inactive / not shipper.

### 3.3 POST `/subscription/checkout`

Body: `{ "plan_id", "period", "auto_pay": true }`  
Server recomputes quote (never trust client totals).  
If total ≤ 0: activate immediately (existing zero-amount path) `{ "activated": true }`.  
If total > 0: Viva order, `merchantTrns`: `{ source, type: "subscription_plan", plan_id, period, user_id, user_type, plan_auto_pay, vat, sub_total, grand_total }`.  
`allowRecurring` = auto_pay.  
Response: `{ "checkout_url", "order_code", "payment_timeout": 300 }`.

409 if another checkout in-flight (optional lock by shipper id, 5 min).

### 3.4 POST `/subscription/verify-payment`

Body: `{ "transaction_id" | "t", "order_code" | "s" }`  
Same as billing verify: fetch Viva, idempotent apply, return `{ "payment_status", "kind": "plan"|"addon" }`.

Public `payment-success` still applies if user lands there; SPA should call verify to avoid depending on session.

### 3.5 POST `/subscription/auto-pay`

Body: `{ "enabled": true }`  
Toggles `user_subscriptions.recurring_payment` and `shippers.auto_pay`. Enabling without a Viva token: 422 “Complete a checkout with auto-pay to store a payment method.”

### 3.6 POST `/subscription/cancel`

Cancels current paid non-cancelled plan. 422 on free/already cancelled.

### 3.7 POST `/subscription/addons/quote`

Body: `{ "addon_price_id", "count": 1, "interval": "month" }`  
JSON only (no HTML). Includes VAT, line description, `is_recurring`.

### 3.8 POST `/subscription/addons/checkout`

Body: `{ "addon_price_id", "count", "auto_pay", "interval" }`  
Validate price row belongs to **current** plan. Viva `type: addon_purchase`.

### 3.9 POST `/subscription/addons/{id}/cancel`

Own `subscription_addons` id.

### 3.10 POST `/subscription/addons/{id}/auto-pay`

Toggle `auto_pay`. Recurring only.

### 3.11 POST `/subscription/contact`

Optional port of contact-us (`type=add_on`).

## 4. Not in this module

- Invoice list/pay/wallet/bank — PDS-948.
- Admin plan CRUD.
- Carrier/driver APIs.

## 5. State transitions (plan)

```
none/login → Essential (free, monthly, expire +1 month)
Essential + paid checkout success → Paid (Plus/Pro)
Paid same-interval upgrade success → Paid (new plan, same expire)
Paid different-interval success → Paid (new cycle)
Paid cancel → PaidCancelled (access until expire)
Paid expire + auto-pay success → Paid (new cycle)
Paid expire + auto-pay fail/off → Essential
Hourly: expire_date < today → status 0 (until cron creates Essential)
```

## 6. Idempotency (required)

Before creating `UserSubscription` / `SubscriptionAddon` / `Invoice`:

1. If `payment_transactions.transaction_id` exists with `status=success` and already linked, return success without insert.
2. Unique index on `payment_transactions.transaction_id` (nullable unique) — only if no legacy duplicates; otherwise application lock.

Use DB transaction around apply.

## 7. Authorization

- Only company owner **or** sub-user with `subscription_module` (match web permission). Confirm Spatie vs subscription permission: web uses `web.shipper.permission`. API should use the same slug if Settings roles map it.
- Mutations: recommend **owner only** (sub-users inherit; paying with company Viva). Confirm with product; old panel used logged-in shipper session including sub-users who can open the page.

## 8. Error catalog

| Code | Example |
| --- | --- |
| `plan_not_found` | 404 |
| `upgrade_not_allowed` | 422 yearly current |
| `addon_not_for_plan` | 422 |
| `no_active_subscription` | 422 add-on |
| `already_cancelled` | 422 |
| `viva_init_failed` | 400 |
| `payment_not_success` | 422 |
| `duplicate_transaction` | 200 idempotent success |

## 9. Frontend consumer

`shipper_react` `src/pages/Subscription/` + `SubscriptionGateModal`. Billing remains separate.

## 10. Tests (backend)

Feature tests under `tests/Feature/Api/Shipper/Subscription/`:

- GET overview as owner / sub-user
- Quote proration same interval / no proration cross interval / VAT GR vs non-GR
- Checkout zero-amount Essential→Essential no-op
- Verify success activates once; second verify no duplicate invoice
- Cancel; auto-pay
- Add-on quote/checkout/cancel
- 401/403
- Add-on for other plan’s price id → 422
