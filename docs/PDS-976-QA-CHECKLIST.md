# PDS-976 — Subscription Permissions QA Checklist

Staging verification matrix for shipper subscription restrictions, upgrades, add-ons, Viva, and receipt emails.

**Environment:** Staging (Viva production deferred)  
**SPA:** React Shipper panel  
**API:** `/api/shipper/v1`  
**Entitlements source:** `GET /auth/me` → `subscription_entitlements` (also on `GET /subscription` → `entitlements`)

**Implementation status (dev):** Entitlements API, UpgradeGate, module gates, private load quota, and entitlement refresh after checkout are landed in code. Rows below are for **staging sign-off** by QA (cannot be marked pass without staging accounts / Viva sandbox).

Status legend: `[ ]` pending · `[x]` pass · `[F]` fail (note bug)

---

## 5A — Plan restrictions (Essential / Plus / Pro)

Use one account per plan (or admin-assign plan). Confirm UI gates **and** API 403 fallback.

| # | Check | Essential | Plus | Pro | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | `/auth/me` returns `subscription_entitlements.plan_name` + permissions map | [ ] | [ ] | [ ] | |
| A2 | Address Book (`manage_address_book_master`) | [ ] | [ ] | [ ] | Page gate + Upgrade modal |
| A3 | Product Master (`manage_product_master`) | [ ] | [ ] | [ ] | |
| A4 | Partners invite limit (`partners` count) | [ ] | [ ] | [ ] | Banner when remaining 0 |
| A5 | ERP Orders (`manage_erp_orders`) | [ ] | [ ] | [ ] | |
| A6 | Search Available Trucks (`search_available_trucks`) | [ ] | [ ] | [ ] | Proactive modal on enter |
| A7 | SAT premium chips (bids / best bid / match) | [ ] | [ ] | [ ] | From `meta.capabilities` |
| A8 | Create Shipment — Save Draft (`draft_shipment`) | [ ] | [ ] | [ ] | |
| A9 | Create Shipment — multi-stop Add Stop (`allow_multiple_stops`) | [ ] | [ ] | [ ] | Gate when ≥2 stops already |
| A10 | Private / Public load type radios | [ ] | [ ] | [ ] | `private_loads` / `public_loads` |
| A11 | Private load quota banner + block publish | [ ] | [ ] | [ ] | Verify DB limits (5 / 200 / ∞) |
| A12 | Public load quota banner + block publish | [ ] | [ ] | [ ] | Verify DB limits (5 / 100 / ∞) |
| A13 | AI Suggested Price button | [ ] | [ ] | [ ] | Essential: denied unless add-on; Plus/Pro: allowed |
| A14 | Support (`feedback_and_support`) | [ ] | [ ] | [ ] | Soft gate + `/support/access` |
| A15 | Messages / Chat (`chat_with_carriers_drivers`) | [ ] | [ ] | [ ] | |
| A16 | Shipment Detail map / live GPS | [ ] | [ ] | [ ] | Upgrade CTA when missing |
| A17 | View POD | [ ] | [ ] | [ ] | |
| A18 | Actual travelled route on map | [ ] | [ ] | [ ] | Pro (+ add-on) |
| A19 | Transporter profile / ratings | [ ] | [ ] | [ ] | |
| A20 | Dispatcher invite seats (`dispatcher_users`) | [ ] | [ ] | [ ] | Settings → Users Upgrade modal |
| A21 | Sub-user inherits **owner** entitlements | [ ] | [ ] | [ ] | Login as dispatcher |

---

## 5B — Upgrade / proration

| # | Case | Expected | Result |
| --- | --- | --- | --- |
| B1 | Plus monthly → Pro monthly (mid-cycle) | Quote `prorated: true`; keeps expire date; charge unused fraction of **new** plan | [ ] |
| B2 | Plus monthly → Pro yearly | `prorated: false`; full `price_yearly * 12` (+ VAT if Greece) | [ ] |
| B3 | Yearly → monthly | Blocked by `assertCanUpgrade` | [ ] |
| B4 | Purchase Essential (free) from panel | Blocked | [ ] |
| B5 | After successful upgrade | `refreshUser` updates entitlements; gated UI unlocks without logout; invoice created | [ ] |
| B6 | Cancel plan | Access until `expire_date`; Cancel label / Plan Cancelled | [ ] |

---

## 5C — Add-ons

| # | Check | Result |
| --- | --- | --- |
| C1 | Recurring status add-on (e.g. AI price on Essential) unlocks immediately after verify | [ ] |
| C2 | Count add-on (partners / dispatcher / loads / bids) increases limit immediately | [ ] |
| C3 | Add-on quote is **not** prorated (full period) | [ ] |
| C4 | Cancel add-on: toast says access until end date; permission still allowed until `end_date` | [ ] |
| C5 | Add-on auto-pay toggle works | [ ] |
| C6 | Contact Us custom add-on request submits | [ ] |

---

## 5D — Viva Wallet (staging)

| # | Check | Result |
| --- | --- | --- |
| D1 | Plan checkout → Smart Checkout → return → `verify-payment` activates plan | [ ] |
| D2 | Add-on checkout same path | [ ] |
| D3 | Zero-payable path activates without Viva redirect | [ ] |
| D4 | Failed / cancelled payment does **not** change subscription | [ ] |
| D5 | Billing Pay Now / wallet pay (PDS-948) still works | [ ] |
| D6 | Production Viva | Deferred (follow-up) |

---

## 5E — Receipt / invoice email

| # | Check | Result |
| --- | --- | --- |
| E1 | After plan pay: invoice `slug=subscription`, status paid | [ ] |
| E2 | After add-on pay: invoice `slug=add-on` | [ ] |
| E3 | `PaymentReceiptNotification` email received | [ ] |
| E4 | Billing SPA lists the invoice | [ ] |

---

## 5F — Regression

| # | Check | Result |
| --- | --- | --- |
| F1 | Past-due lock still forces `/billing` | [ ] |
| F2 | Partner / bid / load caps still enforced by API | [ ] |
| F3 | Carrier/driver WebView subscription unchanged | [ ] |
| F4 | Seat limit after dispatcher add-on | [ ] |

---

## Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| QA | | | |
| Dev | | | |

**Known deferred:** Production Viva verification (epic: later).
