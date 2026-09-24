# PDS-965 — Dispatcher User Creation & Permission Enforcement QA

Shipper React panel + API. Spatie RBAC (`shipper_permissions.value`) is separate from subscription entitlements (PDS-976).

## Preconditions

- Company owner (primary) on a plan with `dispatcher_users` seats ≥ 1 remaining
- Roles seeded: system **Admin** / **Dispatcher** (`config/shipper_rbac.php`)
- React app authenticated as primary for invite tests

---

## A. Create dispatcher & company environment

| # | Step | Expected |
|---|---|---|
| A1 | Settings → Users → Invite with role **Dispatcher** | User appears as `invited`; credentials email sent |
| A2 | Login as new dispatcher | `invited` → `active`; `/auth/me` has `is_sub_user: true`, `parent_shipper_id` set |
| A3 | Same login payload | `company_name`, KYC, `subscription_entitlements` match **parent** |
| A4 | `permissions[]` | Dispatcher pack: has shipment/SAT/collab; **missing** `manage_permissions`, `manage_subscriptions`, `edit_company_account_information` |
| A5 | Dashboard / Manage Shipments | Sees company shipments (shared company environment) |

---

## B. Seat limit

| # | Step | Expected |
|---|---|---|
| B1 | Fill all dispatcher seats (active + invited) | SeatBanner shows remaining 0; Invite disabled / upgrade CTA |
| B2 | Attempt invite anyway | API `403` + seats meta; UI updates seats |
| B3 | Free a seat (deactivate) or buy `dispatcher_users` add-on | Invite works again |

---

## C. Permission enforcement (UI)

Login as dispatcher (default pack) unless noted.

| # | Area | Expected |
|---|---|---|
| C1 | Nav: Create / Manage / Search Trucks / Partners / Messages | Visible (dispatcher has these) |
| C2 | Settings → Users / Roles / Audit | **Hidden**; deep-link `/settings/users` redirects to personal |
| C3 | Profile → Subscription | **Hidden**; `/subscription` redirects to dashboard |
| C4 | Org / KYC edit | View OK if `view_company_account_information`; Edit/Save blocked without `edit_company_account_information` |
| C5 | Custom role: strip `new_shipment` | Create Shipment nav + route blocked |
| C6 | Custom role: strip `delete_all_existing_shipments` | Cancel / bulk cancel hidden |
| C7 | Custom role: strip `view_quotes` | SAT prices blurred |
| C8 | Custom role: strip `add_new_partner` | Invite Partner button hidden |
| C9 | Custom role: strip `accept/Reject_partner_request` | Accept/Decline hidden |
| C10 | Custom role: strip `bid_on_posted_truck` | Book/Bid blocked with permission toast |
| C11 | Custom role: strip publish private/public | Matching broadcast type blocked on Step 3 |
| C12 | Admin sub-user with `manage_permissions` | Users/Roles visible and mutable |

Primary account:

| # | Step | Expected |
|---|---|---|
| C13 | Primary with empty/missing `permissions` | Full Spatie access (unrestricted) |

---

## D. Permission enforcement (API)

As dispatcher without the named permission, call mutation → **403**.

| # | Endpoint family | Permission |
|---|---|---|
| D1 | `POST …/create-shipment/drafts`, `…/publish` | `new_shipment` + publish private/public |
| D2 | Edit shipment save/apply | `edit_all_existing_shipments` |
| D3 | Cancel / bulk-cancel | `delete_all_existing_shipments` (already) |
| D4 | Offers accept/reject (bid vs interest) | `approve/Reject_carrier_bid` / `approve/Reject_carrier_interest` |
| D5 | SAT proceed / store bid | `bid_on_posted_truck` |
| D6 | Partner invite | `add_new_partner` (+ seat) |
| D7 | Partner accept/decline | `accept/Reject_partner_request` |
| D8 | Chat conversations / send | `chat_with_carrier` |
| D9 | Subscription quote/checkout/cancel/addon | `manage_subscriptions` |
| D10 | Organization / KYC update | `edit_company_account_information` |

---

## E. Regression (do not confuse systems)

| # | Check |
|---|---|
| E1 | Subscription gates (Address Book, draft, maps, etc.) still use `subscription_entitlements` |
| E2 | Dispatcher still inherits parent plan entitlements (PDS-976 A21) |
| E3 | Blade Sub-users UI left alone; React uses Spatie `/settings/users|roles` |

---

## Sign-off

| Role | Date | Result | Notes |
|---|---|---|---|
| QA | | Pass / Fail | |
| Dev | | Pass / Fail | |
