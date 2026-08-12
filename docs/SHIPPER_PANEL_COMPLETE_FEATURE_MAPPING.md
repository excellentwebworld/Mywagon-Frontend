# MYVAGON Shipper Panel — Complete Feature Mapping, API & Comparison Spec

| | |
|---|---|
| **Purpose** | Single source of truth for Laravel → React migration, feature parity, and API coverage |
| **Laravel (production)** | Blade panel — `MV_Backend_API` · `routes/shipper.php` · Miro: `miro/Shipper/` |
| **React (in development)** | SPA — `shipper/` · Vite + React Router · `src/router.tsx` |
| **Shipper API (React backend)** | `MV_Backend_API/routes/api/shipper.php` · Base: `/api/shipper/v1` · Sanctum Bearer |
| **Last updated** | 2026-08-12 |
| **Overall progress** | ~60% dev complete (modules built) · see §2 for remaining build work |
| **Status keys** | ✅ Done · 🚧 Partial · ❌ Pending · ➖ N/A / Not required |

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Development status & go-live timeline](#2-development-status--go-live-timeline)
3. [Master comparison matrix](#3-master-comparison-matrix)
4. [Cross-cutting rules (roles, permissions, gates)](#4-cross-cutting-rules)
5. [React Shipper Panel — app map](#5-react-shipper-panel--app-map)
6. [Shipper API catalog (`/api/shipper/v1`)](#6-shipper-api-catalog)
7. [Module specifications (detailed)](#7-module-specifications-detailed)
8. [React-only / enhanced features](#8-react-only--enhanced-features)
9. [API gaps (needed for remaining modules)](#9-api-gaps-needed-for-remaining-modules)
10. [Migration phases & cutover risks](#10-migration-phases--cutover-risks)
11. [Related docs & source paths](#11-related-docs--source-paths)

---

## 1. Architecture overview

### 1.1 Two panels, one product

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MYVAGON Shipper Product                          │
├──────────────────────────────┬──────────────────────────────────────────┤
│  LARAVEL SHIPPER PANEL       │  REACT SHIPPER PANEL                     │
│  (Production / reference)    │  (Under development)                     │
│                              │                                          │
│  Blade + jQuery/DataTables   │  React SPA (Vite)                        │
│  Session auth (web)          │  Sanctum Bearer token                    │
│  routes/shipper.php          │  routes/api/shipper.php                  │
│  Server-rendered HTML        │  JSON API → UI                           │
│  Full feature set            │  Partial feature set + redesigns         │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### 1.2 Stack comparison

| Aspect | Laravel panel | React panel |
|---|---|---|
| Location | `MV_Backend_API` views/controllers | `shipper/` |
| Auth | Session cookie `auth:shipper` | Sanctum token · `POST /auth/login` |
| Routing | Named web routes | `react-router-dom` · `src/router.tsx` |
| Data | Controller → Blade | Service (`src/api/services/*`) → hooks → pages |
| i18n | Laravel `__()` + session locale | `react-i18next` · `en` / `el` |
| Subscription gates | Middleware + Blade `@if` + upgrade modal | API `403` + in-app banners/modals (partial) |
| Maps | Google Maps in Blade | Google Maps JS · `VITE_GOOGLE_MAPS_KEY` |
| Env API base | N/A (same app) | `VITE_API_BASE_URL` (e.g. `https://staging.myvagon.com/api/shipper/v1`) |

### 1.3 Enforcement stack (Laravel — must be mirrored in React)

Priority order after login:

1. Account inactive (primary / sub-user)
2. KYC Pending / Rejected → Profile
3. Company address incomplete → Profile
4. Shipper Information mandatory modal
5. Onboarding tour (if incomplete)
6. Profile completion reminder / info-form after one month
7. Past-due invoice → Billing (`Access Restricted`)

React today: auth + 2FA + some module `403` banners + Settings KYC. **Post-login KYC redirect / info-form SPA gates still missing.** Past-due invoice blocking, load-limit modals, and upgrade gates are handled within **Shipment / Create Shipment** flows (not separate modules).

---

## 2. Development status & go-live timeline

> **Scope:** This section tracks **development** (UI + API implementation) only. QA, staging validation, and release sign-off are separate and not included here.  
> **No official go-live date** is committed in this repo. Timeline below is an engineering estimate from **remaining build work**. Confirm with Product / Jira before external communication.

### Development completion (Aug 2026)

| Bucket | Dev status |
|---|---|
| **Complete** | Search Trucks · Address Book · Product Master · Partners · ERP Orders · Tutorials · Change Password · Support & Feedback (PDS-950) · **Price Lists (PDS-935)** · **Profile Management (PDS-937)** · **CMS / Legal (PDS-937)** |
| **Substantially built** | Settings hub (PDS-937) · Create Shipment wizard · Manage Shipments · Login + 2FA |
| **Partial / in progress** | Shipment Detail · Dashboard · Notifications (**listing pending**; settings done) · KYC (Settings only) |
| **Not started** | Published Edit Shipment · Billing · Subscription · Chat · Post-login gates · Signup · Onboarding · Profile Information · Refer · Account Statement |

**Rough dev progress:** ~60% of modules built or substantially complete · ~70% when counting partial UI+API work on in-progress modules.

### Estimated go-live (development-driven)

| Scenario | Estimated window | What must be **developed** first |
|---|---|---|
| **Hybrid go-live** | **Late Sep – mid Oct 2026** (~6–8 weeks dev) | Finish core freight gaps (Detail, Dashboard, Create polish, Edit Shipment); keep Billing/Subscription/Signup on Laravel |
| **Full SPA cutover** | **Oct – Dec 2026** (~10–14 weeks dev) | Above + Billing · Subscription · Chat · Notifications listing · access gates · Signup/onboarding (or accept permanent Laravel hybrid for onboarding) |

### Remaining development by phase

| Phase | Dev work still pending |
|---|---|
| **A — Core freight** | Published **Edit Shipment** (UI + API); Shipment Detail — remove demo data, wire Edit/co-owner/tracking/logs/GPS/POD; Dashboard — live ShipmentBoard/Schedule/LiveMap; Create Shipment — **private load limit modal** |
| **B — Account & access** | Past-due invoice SPA gate + API; post-login redirect middleware (KYC, address, info-form); React **Signup/register** flow + API; Profile Information questionnaire (UI + API); Onboarding tour (UI + API); Settings — Subscription/Billing sections (currently placeholder) |
| **C — Monetization** | Subscription page (UI + API); Billing page (UI + API); Account Statement (if product confirms) |
| **D — Collaboration** | Notifications **listing** (UI + API; settings done); **Chat** messenger (UI + API); Refer MYVAGON modal (UI + API) |
| **E — Polish** | Public Track (React route or keep Laravel); Settings Integrations + AI Settings (marked coming soon) |

### Active development tracks (Jira)

| Ticket | Module | Remaining **development** |
|---|---|---|
| PDS-917 | Create Shipment | Private load limit modal; any open wizard/API parity gaps |
| PDS-935 | Price Lists | **Dev complete** |
| PDS-937 | Settings | Subscription + Billing sections (placeholders today); Integrations + AI Settings |
| PDS-950 | Support & Feedback | **Dev complete** (Aug 2026) — no further UI/API build required for v1 |

---

## 3. Master comparison matrix

| # | Module | Laravel | React API | Gap summary |
|---|---|---|---|---|
| 1 | Login & Auth | ✅ | ✅ | Login + 2FA challenge; forgot password / register → Laravel; post-login gates not enforced in SPA |
| 2 | Signup & KYC | ✅ | 🚧 | No React register; KYC submit in Settings → Compliance (PDS-937) |
| 3 | Onboarding Tour | ✅ | ❌ | |
| 4 | Profile Information (questionnaire) | ✅ | ❌ | Blocking modal |
| 5 | Dashboard | ✅ | 🚧 | KPI strip live via `/shipments/summary`; ShipmentBoard/Schedule/LiveMap mostly mock |
| 6 | Manage Shipments | ✅ | ✅ | Strong list/actions; published edit missing; some Laravel nuances TBD |
| 7 | Shipment Detail | ✅ | 🚧 | Read API; `detailViewModel` demo fallbacks; Edit toast-only; co-owner/logs/GPS/POD gaps |
| 8 | Create Shipment | ✅ | ✅ | Wizard + drafts API; load limits + plan upgrade gates in wizard flow; private load limit modal still to build |
| 9 | Edit Shipment (published) | ✅ | ❌ | Draft resume only; published-edit UI + API not started |
| 10 | Search Available Trucks | ✅ | ✅ | Redesigned map/list |
| 11 | Address Book | ✅ | ✅ | Redesigned 3-pane |
| 12 | Product Master | ✅ | ✅ | + AI import |
| 13 | Partners | ✅ | ✅ | + notes/tags/lanes |
| 14 | ERP Orders | ➖ | ✅ | React-first |
| 15 | Price Lists (Lane Prices) | ➖ | ✅ | PDS-935 — lane CRUD, import, audit log; **dev complete** |
| 16 | Settings / User Management | ✅ | ✅ | PDS-937 dev largely complete; Subscription/Billing sections still placeholder |
| 17 | Profile Management | ✅ | ✅ | Settings → Personal, Organization, KYC, Legal (PDS-937); **dev complete** |
| 18 | Change Password | ✅ | ✅ | Settings → Security; `PUT /settings/security/password` |
| 19 | Notifications | ✅ | 🚧 | Settings toggles **done**; notification **listing pending** (bell, badges, deep links) |
| 20 | Chat | ✅ | ❌ | Header icon toast-only |
| 21 | Subscription + Add-ons | ✅ | ❌ | `/subscription` placeholder; upgrades deep-link Laravel |
| 22 | Billing | ✅ | ❌ | `/billing` placeholder |
| 23 | Account Statement | ✅ | ❌ | |
| 24 | Support & Feedback | ✅ | ✅ | PDS-950 — KB, tickets, Book a Call; **dev complete** |
| 25 | Tutorials | ✅ | ✅ | `/tutorials` + contextual triggers |
| 26 | Refer MYVAGON | ✅ | ❌ | |
| 27 | CMS (Privacy/Terms/About) | ✅ | ✅ | Policies/Legal via Settings (`/settings/policies`); **dev complete** |
| 28 | Public Track Shipment | ✅ | ❌ | Guest page — may stay Laravel-hosted |

---

## 4. Cross-cutting rules

### 4.1 Roles

| Role | Behaviour |
|---|---|
| **Primary shipper** | Owns company, subscription, KYC, sub-users |
| **Sub-user (dispatcher)** | Permissions from User Management; inherits parent subscription / past-due / KYC context |
| **Guest** | Public track shipment only |

### 4.2 Sub-user permission groups (Laravel)

- Create Shipment
- Manage Shipments
- Carrier Assignment
- Collaboration
- Control (manage other users)
- Billing
- Company Account Information (view / edit)

Notable flags: `view_only_owned_shipments` / `view_all_existing_shipments`, `view_quotes`, `accept/Reject_partner_request`, `view_company_account_information`, `edit_company_account_information`.

### 4.3 Subscription permission slugs

| Slug | Gates |
|---|---|
| `manage_shipment` | Manage Shipments, dashboard View Details |
| `draft_shipment` | Save draft |
| `allow_multiple_stops` | Add New Order |
| `private_loads` | Public / Private type |
| `view_quotes` | Clear vs blurred prices |
| `view_map` | Interactive maps |
| `actual_travelled_route` | Actual GPS path |
| `live_gps_shipment_tracking` | Live GPS on trip |
| `view_electronic_pods` | POD images |
| `rating_and_review_for_transporter` | Rate carrier |
| `send_tracking_links_to_your_customers_per_month` | Tracking emails |
| `filter_and_search_in_all_the_modules` | Search / filter / sort |
| `search_available_trucks` | SAT module |
| `create_shipment_from_search_available_truck` | Bid → create |
| `view_matched_trucks_for_availability` | Exact match |
| `count_of_bids_per_month` | Bid quota |
| `view_current_best_bid_for_a_posted_truck` | Best bid tooltip |
| `view_if_public_bids_have_been_submitted_for_a_posted_truck` | Bids-received tooltip |
| `manage_address_book_master` | Address Book |
| `manage_product_master` | Product Master |
| `partners` | Partner invite/accept |
| `user_management` | Sub-users module |
| `dispatcher_users` | Seat limit |
| `profile_management` | Profile |
| `notifications` | Notifications |
| `chat_with_carriers_drivers` | Chat |
| `account_statement` | Billing |
| `feedback_and_support` | Support & Feedback |
| `manage_erp_orders` | ERP Orders (API/React) |

### 4.4 Shipment status lifecycle

```
Draft → Pending → Scheduled → Ready → Past Due → On Trip
     → Fulfilled | Partially Fulfilled | Not Fulfilled | Canceled / Rejected
```

**Pending sub-states:** open bids · availability bids · partner interest · carrier pending.

---

## 5. React Shipper Panel — app map

### 5.1 Project layout

| Path | Role |
|---|---|
| `shipper/src/router.tsx` | Routes |
| `shipper/src/pages/*` | Screens |
| `shipper/src/components/*` | UI building blocks |
| `shipper/src/api/client.ts` | HTTP client · `ApiError` |
| `shipper/src/api/services/*` | Domain API calls |
| `shipper/src/api/mappers/*` | API ↔ UI models |
| `shipper/src/locale/` | EN / EL strings |
| `shipper/docs/*` | Module parity / QA checklists |

### 5.2 Routes

| Path | Page | Auth |
|---|---|---|
| `/login` | LoginPage | Public |
| `/` · `/about` | Marketing (only when no `basename`) | Public |
| `/dashboard` | Dashboard | Protected |
| `/shipments` | ManageShipments | Protected |
| `/shipments/:id` | ShipmentDetail | Protected |
| `/shipments/create/step/1\|2\|3` | CreateShipmentWizard | Protected |
| `/search-trucks` | SearchTrucks | Protected |
| `/address-book` | AddressBook | Protected |
| `/products` | ProductMaster | Protected |
| `/partners` | Partners | Protected |
| `/pricing` | PriceListsPage | Protected |
| `/erp-orders` | ErpOrders | Protected |
| `/settings` · `/settings/:section` | Settings | Protected |
| `/settings/:section/:tab` | User edit (Users & Roles) | Protected |
| `/billing` | BillingPage (placeholder) | Protected |
| `/subscription` | SubscriptionPage (placeholder) | Protected |
| `/support` | SupportPage | Protected |
| `/tutorials` | TutorialsPage | Protected |
| `/trust` | Redirect → `/settings/trustCenter` | Protected |

With `basename` set: `/` redirects to `/address-book`.

### 5.3 Sidebar navigation

| Nav item | Target | Status |
|---|---|---|
| Dashboard | `/dashboard` | 🚧 |
| Create Shipment | `/shipments/create` | 🚧 |
| Manage Shipments | `/shipments` | 🚧 |
| Truck Availability (BETA) | `/search-trucks` | ✅ |
| Address Book | `/address-book` | ✅ |
| Product Master | `/products` | ✅ |
| Partners | `/partners` | ✅ |
| Price Lists | `/pricing` | ✅ |
| ERP Orders | `/erp-orders` | ✅ |
| Settings | `/settings` | 🚧 |
| Subscription | `/subscription` | ❌ placeholder |
| Billing | `/billing` | ❌ placeholder |
| Support | `/support` | ✅ |
| Tutorial | `/tutorials` | ✅ |

### 5.4 React API services ↔ backend

| Service file | API prefix | Module |
|---|---|---|
| (auth in `api/auth`) | `/auth/*`, `/auth/2fa/*` | Login + 2FA |
| `addressBookService.ts` | `/address-book/*` | Address Book |
| `productMasterService.ts` | `/product-master/*` | Product Master |
| `partnersService.ts` | `/partners/*` | Partners |
| `priceLanesService.ts` | `/price-lists/*` | Price Lists |
| `availabilitiesService.ts` | `/availabilities/*` | Search Trucks |
| `createShipmentService.ts` | `/create-shipment/*` | Create Wizard |
| `shipmentsService.ts` | `/shipments/*` | Manage + Detail |
| `erpOrdersService.ts` | `/erp-orders/*` | ERP Orders |
| `supportService.ts` | `/support/*` | Support & Feedback |
| `tutorialsService.ts` | `/tutorials/*` | Tutorials |
| `*SettingsService.ts` | `/settings/*` | Settings (PDS-937) |
| `usersSettingsService.ts` | `/settings/users/*`, `/settings/roles/*` | Users & Roles |

### 5.5 Auth model (React)

- Login stores Sanctum token; optional **2FA challenge** (`POST /auth/2fa/verify`) before full session.
- `ProtectedRoute` guards app layout (auth only — no KYC/past-due gates yet).
- `GET /auth/me` returns profile fields including `kyc_status`, `is_sub_user`, `permissions[]`.
- Forgot password / Register deep-link to Laravel (`VITE_LARAVEL_URL`).
- Password change + 2FA setup live under Settings → Security.

---

## 6. Shipper API catalog

**Base URL:** `{host}/api/shipper/v1`  
**Auth:** `Authorization: Bearer {token}` (except login / 2FA challenge)  
**Middleware (authenticated group):** `auth:sanctum` · `language.manager` · `EnsureShipperUser` · `last.active` · `ApiShipperSubUserRestricted`

### 6.1 Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Login · returns token or 2FA challenge |
| POST | `/auth/2fa/verify` | Complete 2FA challenge |
| POST | `/auth/2fa/resend-email` | Resend 2FA email OTP |
| POST | `/auth/2fa/recovery/send-email` | Recovery email |
| POST | `/auth/2fa/recovery/verify` | Recovery verify |
| GET | `/auth/me` | Current shipper profile |
| POST | `/auth/logout` | Revoke token |

### 6.2 Address Book

| Method | Path | Purpose |
|---|---|---|
| GET | `/address-book/summary` | Directory / facet counts |
| GET | `/address-book/export` | Excel export |
| GET | `/address-book/companies` | Company lookup |
| GET/POST | `/address-book/company-entities` | List / create company entity |
| GET | `/address-book/amenities` | Amenity options |
| POST | `/address-book/locations/check-duplicate` | Duplicate check |
| GET/POST | `/address-book/locations` | List / create |
| GET/PUT/DELETE | `/address-book/locations/{id}` | Show / update / archive |
| GET | `/address-book/locations/{id}/stats` | Usage stats |
| POST | `/address-book/locations/{id}/restore` | Restore archived |

### 6.3 Product Master

| Method | Path | Purpose |
|---|---|---|
| GET | `/product-master/summary` | Facet / KPI counts |
| GET | `/product-master/reference/categories*` | Category references |
| GET | `/product-master/types` | Types grid |
| GET | `/product-master/export` | Excel export |
| GET | `/product-master/import/template` | Import template |
| POST | `/product-master/import` | CSV/Excel import |
| POST | `/product-master/ai/transform` | AI map messy file |
| POST | `/product-master/ai/confirm-import` | Confirm AI import |
| POST | `/product-master/skus/bulk-archive` | Bulk archive |
| GET/POST | `/product-master/skus` | List / create |
| GET/PUT | `/product-master/skus/{id}` | Show / update |
| POST | `/product-master/skus/{id}/toggle-status` | Active/Inactive |

### 6.4 Partners

| Method | Path | Purpose |
|---|---|---|
| GET | `/partners/summary` | KPI + facets |
| GET | `/partners/reference/truck-categories` | Capability filters |
| GET | `/partners/` | Paginated list |
| POST | `/partners/invite` | Invite partner |
| GET | `/partners/{id}` | Detail |
| POST | `/partners/{id}/accept\|decline` | Request actions |
| DELETE | `/partners/{id}` | Remove / cancel invite |
| POST | `/partners/{id}/toggle-status` | Suspend / reactivate |
| POST | `/partners/{id}/toggle-preferred` | Preferred flag |
| POST | `/partners/{id}/notes` | Notes |
| POST | `/partners/{id}/tags` | Tags |
| POST/DELETE | `/partners/{id}/contract-lanes[/{laneId}]` | Contract lanes |

### 6.5 Availabilities (Search Trucks)

| Method | Path | Purpose |
|---|---|---|
| GET | `/availabilities/` | List (filters, bounds, infinite scroll) |
| GET | `/availabilities/export` | CSV export |
| GET | `/availabilities/{id}` | Detail |
| POST | `/availabilities/{id}/proceed` | Proceed choice |
| GET | `/availabilities/{id}/pending-matches` | Match pending loads |
| POST | `/availabilities/{id}/bids` | Place bid on pending shipment |

### 6.6 Create Shipment (drafts)

| Method | Path | Purpose |
|---|---|---|
| GET | `/create-shipment/reference/vehicle-types` | Truck types |
| POST | `/create-shipment/drafts` | Create draft |
| GET | `/create-shipment/drafts/{id}` | Load draft |
| PUT | `/create-shipment/drafts/{id}/step-1\|2\|3` | Save step |
| POST | `/create-shipment/drafts/{id}/publish` | Publish |
| POST | `/create-shipment/drafts/{id}/ai-suggested-price` | AI price |
| POST | `/create-shipment/check-public-limit` | Public quota |
| DELETE | `/create-shipment/drafts/{id}` | Delete draft |

### 6.7 Shipments (Manage / Detail)

| Method | Path | Purpose |
|---|---|---|
| GET | `/shipments/summary` | KPI / status counts |
| GET | `/shipments/filter-facets` | Filter facet options |
| GET | `/shipments/export` | Excel export |
| GET | `/shipments/` | Paginated list |
| GET | `/shipments/{id}` | Detail |
| GET | `/shipments/{id}/cancel-reasons` | Cancel reasons |
| POST | `/shipments/{id}/cancel` | Cancel load |
| POST | `/shipments/bulk-cancel` | Bulk cancel |
| POST | `/shipments/bulk-extend-bid` | Bulk extend bid |
| POST | `/shipments/{id}/offers/{offerId}/accept\|reject\|counter` | Offer actions |
| GET | `/shipments/{id}/offers/{offerId}/negotiation-history` | Negotiation history |
| POST | `/shipments/{id}/invites` | Invite partner |
| POST | `/shipments/{id}/invites/{partnerId}/remind` | Remind |
| DELETE | `/shipments/{id}/invites/{partnerId}` | Withdraw invite |
| POST | `/shipments/{id}/rating` | Rate carrier |
| GET | `/shipments/{id}/pickup-delay/pending` | Reportable pickup delays |
| POST | `/shipments/{id}/locations/{locationId}/pickup-delay` | Submit pickup delay |

### 6.8 ERP Orders

| Method | Path | Purpose |
|---|---|---|
| GET | `/erp-orders/summary` | Status KPIs |
| GET | `/erp-orders/import/template` | Template |
| POST | `/erp-orders/ai/transform` | AI map CSV |
| POST | `/erp-orders/ai/confirm-import` | Confirm import |
| GET | `/erp-orders/customers` | Customers |
| GET | `/erp-orders/export` | Export |
| GET/POST | `/erp-orders/` | List / create |
| GET/PUT/DELETE | `/erp-orders/{id}` | Show / update / delete |

### 6.9 Price Lists (PDS-935)

| Method | Path | Purpose |
|---|---|---|
| GET | `/price-lists/lanes` | Lane list |
| GET | `/price-lists/lanes/summary` | KPI summary |
| POST | `/price-lists/lanes` | Create lane |
| PUT | `/price-lists/lanes/{id}` | Update lane |
| POST | `/price-lists/lanes/import` | Import lanes |
| GET | `/price-lists/audit-log` | Audit log |
| GET | `/price-lists/audit-log/export` | Export audit log |

### 6.10 Support & Feedback (PDS-950)

| Method | Path | Purpose |
|---|---|---|
| GET | `/support/access` | Permission gate + upgrade URL |
| GET | `/support/kb/categories` | KB categories |
| GET | `/support/kb/articles` | KB article list |
| GET | `/support/kb/articles/{id}` | KB article detail |
| POST | `/support/kb/articles/{id}/feedback` | Helpful vote |
| GET | `/support/form-options` | Feedback form options |
| GET | `/support/meeting-options` | Book a Call options |
| GET/POST | `/support/requests` | Ticket list / create |
| GET | `/support/requests/{ticketNumber}` | Ticket detail + thread |
| POST | `/support/requests/{ticketNumber}/replies` | Shipper reply |

### 6.11 Tutorials

| Method | Path | Purpose |
|---|---|---|
| GET | `/tutorials` | Full library |
| GET | `/tutorials/by-section` | Contextual videos by module |

### 6.12 Settings (PDS-937)

| Method | Path | Purpose |
|---|---|---|
| GET/PUT | `/settings/personal` | Personal profile |
| POST | `/settings/personal/avatar` | Avatar upload |
| GET | `/settings/personal/ratings` | Shipper ratings |
| GET/PUT | `/settings/organization` | Company profile |
| POST | `/settings/organization/logo` | Logo upload |
| PUT | `/settings/security/password` | Change password |
| GET/POST | `/settings/security/2fa/*` | 2FA setup / enable / disable / recovery |
| GET/POST | `/settings/kyc` | KYC show / submit |
| GET | `/settings/policies`, `/settings/policies/{key}` | Privacy / Terms |
| GET | `/settings/trust` | Trust center data |
| GET/PUT | `/settings/notifications` | Notification preferences |
| GET | `/settings/audit`, `/settings/users/audit` | Platform + user audit logs |
| GET | `/settings/users` | Sub-user list |
| POST | `/settings/users/invite` | Invite sub-user |
| GET/PUT | `/settings/users/{id}` | User detail / update |
| POST | `/settings/users/{id}/deactivate\|reactivate\|…` | User lifecycle |
| GET/POST/PUT/DELETE | `/settings/roles`, `/settings/roles/{name}` | Custom roles |
| GET | `/settings/permissions` | Permissions catalog |

---

## 7. Module specifications (detailed)

Each module below uses the same checklist fields.

---

### 6.1 Login & Auth

| Field | Detail |
|---|---|
| **Overview** | Sign-in for primary + sub-users; language; session; post-login gates; 2FA. |
| **Laravel functionalities** | Email/password; EN/GR; Forgot password; inactive primary/sub-user messaging; logout; load sub-user permissions; free plan on first login; KYC/address redirects. |
| **React functionalities** | Login page; validation; token session; **2FA challenge flow**; logout confirm; EN/EL toggle; ProtectedRoute. |
| **Roles & permissions** | Active primary/sub-user required. |
| **Business rules** | Wrong credentials message; inactive blocks; KYC pending/rejected → Profile; incomplete address after KYC → Profile. |
| **Validation** | Email format; password required. |
| **UI / screens** | Login; Forgot password (Laravel); Inactive modal (Laravel); 2FA verify screen. |
| **Actions** | Login, Logout, 2FA verify, Reset password, Change language. |
| **API** | `POST /auth/login`, `/auth/2fa/*`, `GET /auth/me`, `POST /auth/logout`. |
| **Dependencies** | Signup/KYC, Profile, Billing, Subscription. |
| **Edge cases** | Concurrent session; post-login gates not enforced in SPA yet. |
| **Status** | Laravel ✅ · React 🚧 · API ✅ |
| **Comparison** | 2FA added (Aug 2026). Forgot password & register → Laravel URLs. Post-login KYC/address/info-form gates still missing. |

---

### 6.2 Signup & KYC

| Field | Detail |
|---|---|
| **Overview** | Registration + email/phone verify + VAT certificate; admin KYC review. |
| **Laravel** | Full signup form; OTP verify; consent; KYC Pending→Accepted/Rejected; admin history. |
| **React** | No self-registration; **KYC submit in Settings → Compliance** (PDS-937). |
| **API** | `GET/POST /settings/kyc` — no public register endpoints. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | Existing shippers can complete KYC in SPA. New signup remains Laravel until register API exists. |

---

### 6.3 Onboarding Tour

| Field | Detail |
|---|---|
| **Overview** | Intro.js tour on Dashboard for first-time shippers. |
| **Laravel** | 8 steps; Finish/Skip marks `onboarding_completed`; Help Tour button. |
| **React** | Not implemented. |
| **API** | Web: `complete-onboarding`, `onboarding-status`, `reset-onboarding` — not in SPA API. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.4 Profile Information (mandatory questionnaire)

| Field | Detail |
|---|---|
| **Overview** | Blocking Shipper Information modal + Profile Operations questions. |
| **Laravel** | Required company type, products, volumes, lanes, trucks, challenges, goals; reminder after 1 month. |
| **React** | Not implemented. |
| **API** | Web profile-info routes only. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.5 Dashboard

| Field | Detail |
|---|---|
| **Overview** | Home: status counts, recent loads, trucks widget, notifications, map. |
| **Laravel** | Full live widgets; status cards → Manage Shipments; `view_map` / `view_quotes` / `manage_shipment` gates. |
| **React** | Redesigned layout; `GET /shipments/summary` wired in KpiStrip; Schedule / LiveMap / ShipmentBoard / Notifications largely mock (`companyNameDemo`, `mockData`). |
| **API used** | `GET /shipments/summary` (KPI strip only). |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | Aug 2026: KPI counts live; ShipmentBoard still uses `mockData`. Need live recent shipments, map, trucks widget, notifications feed. |

---

### 6.6 Manage Shipments

| Field | Detail |
|---|---|
| **Overview** | List / filter / sort / cancel / invite / negotiate loads. |
| **Laravel functionalities** | All/Private/Public; status tabs + counts; filter/sort modals; table; View/Edit/Delete; cancel reasons; export; owned-vs-all sub-user scope. |
| **React functionalities** | Outbound/inbound toggle; KPI strip; status tabs; search/sort/filters; pagination; row expansion; accept/reject/counter; invite/remind/remove; bulk cancel/extend; export; navigate to detail/create. |
| **Permissions** | `manage_shipment`, `filter_and_search_in_all_the_modules`, `view_quotes`, owned/all shipments. |
| **Business rules** | Active aggregate; drafts → edit not detail; draft auto-delete ~10 days; Ready ≤8h; Past Due >24h after ready pickup; Public Beta tag. |
| **Filters** | Carrier, product, type, truck, pickup/dropoff+radius, trip length, price, pickup window; sort options. |
| **Actions** | View, Edit, Cancel, Export, Offer accept/reject/counter, Invite, Bulk ops. |
| **API** | Full `/shipments/*` (see §5.7). |
| **Status** | Laravel ✅ · React 🚧 · API ✅ |
| **Comparison** | React is strong on list ops. Chat opens detail instead of messenger. Published edit incomplete. Confirm inbound direction parity. |

---

### 6.7 Shipment Detail (Load Details)

| Field | Detail |
|---|---|
| **Overview** | Single-load hub: timeline, bids, partners, map, POD, co-owners, rating. |
| **Laravel** | Full bid tables (accept/decline/counter/history/chat); tracking links; logs; co-owner; cancel; rate; GPS/POD gates. |
| **React** | Rich cards (CommandHeader, Stops, Carrier, Billing, Docs, Tracking, Audit); `GET /shipments/{id}`; many buttons toast-only; `detailViewModel.ts` fills demo fallbacks (sample stops/orders/owner). |
| **Permissions** | `view_quotes`, `view_map`, GPS/POD/rating/tracking slugs. |
| **API** | Read + cancel + offers + invites. Missing: co-owner, rating, tracking-link CRUD, logs, live GPS, POD upload/list as dedicated endpoints for SPA. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | Highest visual polish vs lowest action fidelity among freight screens. Priority: remove demo data; wire real actions. |

---

### 6.8 Create Shipment

| Field | Detail |
|---|---|
| **Overview** | Multi-step publish: cargo/stops → itinerary → broadcast/price/partners → publish/draft. |
| **Laravel** | Wizard + Review; inline SKU/location; AI price; private/public; quotas; SAT prefill. |
| **React** | 3 steps (`/shipments/create/step/1-3`); draft persistence; SAT + ERP prefills; availability context bar; AI price; public limit check; partner selection. |
| **Permissions** | `draft_shipment`, `allow_multiple_stops`, `private_loads`, `view_map`, `view_quotes`. |
| **Validations** | Required order/product/qty/weight/locations/dates/truck; pickup before delivery; no same-location P/D; range end after start. |
| **API** | Full `/create-shipment/*` (§5.6). |
| **Status** | Laravel ✅ · React 🚧 · API ✅ |
| **Comparison** | Core wizard dev complete; private load limit modal still to build. |

---

### 6.9 Edit Shipment

| Field | Detail |
|---|---|
| **Overview** | Edit existing load; lock in-progress stops; old vs new itinerary. |
| **Laravel** | Full update table; locked stops; inconvenience warning; Confirm Updated Itinerary. |
| **React** | Draft resume via `?id=` on create wizard; Detail Edit often toast-only; **no published-load edit parity**. |
| **API** | Draft PUT steps only — **no published-edit SPA API** (Aug 2026). |
| **Status** | Laravel ✅ · React 🚧 · API ❌ |
| **Comparison** | Critical ops gap for production cutover. Detail Edit button is toast-only. |

---

### 6.10 Search Available Trucks

| Field | Detail |
|---|---|
| **Overview** | Discover carrier truck posts; bid via new shipment or match pending. |
| **Laravel** | Public/Private tabs; table; filter/sort; Proceed modal; match-load; booking request. |
| **React** | Map+list redesign; SearchPill; infinite scroll; map-bounds; cargo filters; booking drawer; subscription gate; CSV export; create prefill. |
| **Permissions** | `search_available_trucks` + filter/quote/bid/match/create-from-SAT slugs. |
| **API** | Full `/availabilities/*` (§5.5). |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | UX redesigned (client-approved). Parity doc Done. Mock via `VITE_USE_SEARCH_TRUCKS_MOCK`. |

---

### 6.11 Address Book

| Field | Detail |
|---|---|
| **Overview** | My / Customer locations; company grouping; amenities; times; map. |
| **Laravel** | Accordion by company; CRUD; duplicate check; soft delete; search gated. |
| **React** | 3-pane redesign; facets; 4-step create; archive/restore; export; Google Places. |
| **Permissions** | `manage_address_book_master`, `filter_and_search_in_all_the_modules`. |
| **Validations** | Required type/name/company/VAT/address/latlng/city/postal; unique name per company. |
| **API** | Full `/address-book/*` (§5.2). |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | Redesign intentional. `ADDRESS_BOOK_PARITY.md` Done. |

---

### 6.12 Product Master

| Field | Detail |
|---|---|
| **Overview** | Category → Type → SKU catalog for shipments. |
| **Laravel** | Tree CRUD; Excel import; export index/template; search gated. |
| **React** | 3-pane SKUs/Types; facets; toggle; bulk archive; import/export; **AI Wizard**. |
| **Permissions** | `manage_product_master`, filter/search. |
| **API** | Full `/product-master/*` (§5.3). |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | AI import is React enhancement. Parity Done. |

---

### 6.13 Partners

| Field | Detail |
|---|---|
| **Overview** | Invite/manage carriers, freelancers, (React) shipper suppliers. |
| **Laravel** | My Partners / Requests; invite email/phone/UID; suggestions; accept/decline/delete; limit blur. |
| **React** | 3-pane; KPIs; facets; preferred; notes; tags; contract lanes; suspend; supplier type. |
| **Permissions** | `partners`; sub-user accept/reject; seat limits. |
| **API** | Full `/partners/*` (§5.4). |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | React richer than classic Blade. Incoming Loads deferred per Partners parity. |

---

### 6.14 ERP Orders (React-first)

| Field | Detail |
|---|---|
| **Overview** | Order registry → Create Load into wizard; AI CSV import. |
| **Laravel web** | Not present as classic panel module. |
| **React** | KPI filters; CRUD unplanned; AI wizard; create load multi-select; linked load; export. |
| **Permissions** | `manage_erp_orders`. |
| **API** | Full `/erp-orders/*` (§5.8). |
| **Status** | Laravel ➖ · React ✅ · API ✅ |
| **Comparison** | Net-new capability — track as React feature, not Laravel parity debt. |

---

### 6.15 Price Lists / Lane Prices (React-first, PDS-935)

| Field | Detail |
|---|---|
| **Overview** | Contract lane pricing registry; used in Create Shipment Step 3 partner/lane matching. |
| **Laravel web** | Not present as classic panel module. |
| **React** | `/pricing` — lane list, add/edit modal, import, audit log; metric-row pricing model. |
| **Permissions** | Plan/sub-user gated (module banners). |
| **API** | `/price-lists/*` (§6.9). |
| **Status** | Laravel ➖ · React ✅ · API ✅ |
| **Comparison** | **Development complete** (PDS-935). Lane CRUD, import, audit log, overlap/conflict validation. See `PDS-935-Lane-Prices-UI-Revamp.md`. |

---

### 6.16 User Management

| Field | Detail |
|---|---|
| **Overview** | Dispatcher sub-users + permission matrix + seat limits. |
| **Laravel** | Full CRUD; block/unblock; permission groups; credentials email; `dispatcher_users` limit. |
| **React** | **Settings → Users & Roles** (PDS-937): invite, edit, deactivate/reactivate, custom roles, permission grid, seat banner, audit tab. |
| **API** | `/settings/users/*`, `/settings/roles/*`, `/settings/permissions`. |
| **Status** | Laravel ✅ · React 🚧 · API ✅ |
| **Comparison** | Dev substantially complete Aug 2026 (Users/Roles, invite, audit, 2FA, KYC, org/personal). Settings → Subscription/Billing still placeholder. |

---

### 6.17 Profile Management

| Field | Detail |
|---|---|
| **Overview** | Personal / Company / Operations / KYC tabs; completion %. |
| **Laravel** | Full forms; avatar; KYC upload; sub-user locks. |
| **React** | **Settings → Personal, Organization, Compliance (KYC), Legal** — not 1:1 legacy Profile page layout. |
| **API** | `/settings/personal`, `/settings/organization`, `/settings/kyc`, `/settings/policies`. |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | **Development complete** via Settings (PDS-937): Personal, Organization, KYC, Legal/policies. Profile Information questionnaire remains a separate module (§3 #4). |

---

### 6.18 Change Password

| Field | Detail |
|---|---|
| **Overview** | Current / New / Confirm with complexity rules. |
| **Laravel** | Full form in user menu. |
| **React** | Settings → Security password form. |
| **API** | `PUT /settings/security/password`. |
| **Status** | Laravel ✅ · React ✅ · API ✅ |

---

### 6.19 Notifications Listing & Settings

| Field | Detail |
|---|---|
| **Overview** | Bell dropdown; listing; push/email toggles; sidebar badges. |
| **Laravel** | Full listing + settings + deep links + realtime badges. |
| **React** | **Settings → Notifications** toggles **done**; header bell + listing **pending**. |
| **API** | `GET/PUT /settings/notifications` done; listing/badge endpoints **pending**. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | Settings complete; notification **listing pending** (bell dropdown, badges, deep links). |

---

### 6.20 Chat

| Field | Detail |
|---|---|
| **Overview** | Messenger with carriers/drivers/Support. |
| **Laravel** | Inbox + thread + realtime; shipment-context entry; composer rules. |
| **React** | Message actions → detail/toast. |
| **API** | None. |
| **Permissions** | `chat_with_carriers_drivers`. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.21 Subscription + Add-ons

| Field | Detail |
|---|---|
| **Overview** | Plans, upgrade/cancel, auto-pay, add-ons. |
| **Laravel** | Full subscription page + payment handlers. |
| **React** | `/subscription` + Settings → Subscription show **placeholder**; module 403s deep-link Laravel plan URL. |
| **API** | None for SPA. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Hybrid acceptable short-term (upgrade opens Laravel). Full SPA later. |

---

### 6.22 Billing

| Field | Detail |
|---|---|
| **Overview** | Invoices, wallet pay, bank transfer receipt, print. |
| **Laravel** | Full Billing History & Invoices. |
| **React** | `/billing` + Settings → Billing **placeholder**. |
| **API** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.23 Account Statement

| Field | Detail |
|---|---|
| **Overview** | Wallet ledger; Download All; date filter. |
| **Laravel** | Exists; menu often commented out. |
| **React** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Confirm product need before building. |

---

### 6.24 Support & Feedback

| Field | Detail |
|---|---|
| **Overview** | Knowledge base, support tickets, Book a Call (HubSpot). |
| **Laravel** | Feedback + Support pages; Calendly on feedback. |
| **React** | `/support` — KB, Create Request, My Requests + thread, Book a Call (PDS-950). |
| **API** | Full `/support/*` (§6.10). |
| **Permissions** | `feedback_and_support`. |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | **Development complete** for v1 (Aug 2026). KB, tickets, thread replies, Book a Call, permission gate. |

---

### 6.25 Tutorials

| Field | Detail |
|---|---|
| **Overview** | YouTube library + contextual help icons. |
| **Laravel** | Full library + section fetch. |
| **React** | `/tutorials` page + `ContextualTutorialTrigger` on modules. |
| **API** | `GET /tutorials`, `/tutorials/by-section`. |
| **Status** | Laravel ✅ · React ✅ · API ✅ |

---

### 6.26 Refer MYVAGON

| Field | Detail |
|---|---|
| **Overview** | Referral code modal; copy message; credits. |
| **Laravel** | Top-bar promo + Profile code. |
| **React** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.27 CMS Pages

| Field | Detail |
|---|---|
| **Overview** | Privacy, Terms, About (EN/EL CMS). |
| **Laravel** | CMS-backed pages. |
| **React** | **Settings → Legal / Agreements** loads CMS via `/settings/policies`. |
| **API** | `GET /settings/policies`, `/settings/policies/{key}`. |
| **Status** | Laravel ✅ · React ✅ · API ✅ |
| **Comparison** | **Development complete** (PDS-937). |

---

### 6.28 Public Track Shipment

| Field | Detail |
|---|---|
| **Overview** | Guest tracking via encrypted link. |
| **Laravel** | `shipper/track-shipment/{id}/{location_id}`. |
| **React** | None — may stay Laravel-hosted. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Decide: keep Blade public page vs build React public route. |

---

## 8. React-only / enhanced features

| Feature | Notes |
|---|---|
| **ERP Orders module** | Full order registry + Create Load bridge |
| **Price Lists (Lane Prices)** | PDS-935 contract lane registry + audit log |
| **Settings hub (PDS-937)** | Unified Personal / Org / Security / KYC / Users / Audit / Trust |
| **Support hub (PDS-950)** | KB + tickets + HubSpot Book a Call |
| **Product Master AI Wizard** | Messy CSV → preview → confirm |
| **ERP Orders AI Wizard** | Same pattern for orders |
| **SAT map UX** | Airbnb pill, bounds search, Directions polylines, infinite scroll |
| **Create ↔ SAT/ERP integration** | Prefill + `availability_id` on publish |
| **Partners enhancements** | Notes, tags, preferred, contract lanes, supplier type |
| **Address Book / Product redesign** | Client-approved 3-pane masters |
| **2FA (login + settings)** | Email/authenticator + recovery flows |

These are **not** Laravel parity debt — they are intentional React/API advances.

---

## 9. API gaps (needed for remaining modules)

| Domain | Needed for SPA | Suggested endpoints (illustrative) |
|---|---|---|
| Signup / register | Self-registration | `POST /auth/register`, verify OTP endpoints |
| Profile Information | Mandatory questionnaire modal | `GET/PUT /profile-information` |
| Notifications listing | Bell dropdown, badges, deep links | `/notifications`, mark-visited |
| Chat | Messages | `/chat/threads`, `/chat/messages`, upload |
| Subscription | Plans / add-ons | `/subscription/plans`, purchase, cancel, auto-pay |
| Billing | Invoices / pay | `/billing/invoices`, pay, bank-receipt, wallet |
| Account statement | Wallet ledger | `/account-statement` |
| Past-due gate | SPA middleware | *(Tracked under Shipment / Billing flows — not a separate module)* |
| Onboarding | Tour | `POST /onboarding/complete` |
| Refer | Referral modal | `/referral` |
| Edit published shipment | Edit flow | Extend create-shipment or `/shipments/{id}/edit-*` |
| Detail extras | Co-owner, POD list, logs, tracking links CRUD | Dedicated shipment sub-resources |
| Load limits / upgrade gates | Create Shipment, SAT, masters | In-module 403 + modals (no standalone module) |

**Recently closed (Aug 2026):** Profile/KYC update, Users/Roles, Change password, Support, Tutorials, Notification settings, Policies — see §6.12.

---

## 10. Migration phases & cutover risks

### 10.1 Phases

| Phase | Focus | Modules | Progress (Aug 2026) |
|---|---|---|---|
| **A — Core freight** | Day-to-day ops | Address Book ✅ · Product ✅ · Partners ✅ · SAT ✅ · ERP ✅ · Price Lists ✅ · Create 🚧 · Manage 🚧 · Detail 🚧 | ~80% |
| **B — Account & access** | Hard gates | Auth/2FA 🚧 · Signup ❌ · KYC 🚧 · Settings/Profile ✅ · Profile Info ❌ · Users 🚧 · Change Password ✅ | ~60% |
| **C — Monetization** | Revenue | Subscription ❌ · Billing ❌ | ~15% |
| **D — Collaboration** | Engagement | Notifications 🚧 (listing pending) · Chat ❌ · Refer ❌ · Support ✅ · Tutorials ✅ · Onboarding ❌ | ~55% |
| **E — Polish** | Closeout | Dashboard 🚧 · Published Edit ❌ · CMS ✅ · Public Track strategy | ~35% |

### 10.2 Development blockers (must build before full cutover)

1. Post-login enforcement: KYC / company address / info-form redirects  
2. Subscription + Billing SPA (or permanent Laravel embed decision)  
3. Shipment Detail — remove demo fallbacks; wire critical actions  
4. Published Edit Shipment (UI + API)  
5. Create Shipment — private load limit modal (within wizard flow)  
6. Notifications listing (settings done)  
7. Chat (if required for parity at cutover)  

**Not dev blockers if hybrid accepted:** Signup/register, Forgot password, Public Track, payment return URLs → can remain Laravel-hosted.

### 10.3 Acceptable hybrid (short-term)

- Forgot password / Register → Laravel  
- Upgrade Now → Laravel subscription URL  
- Public Track → Laravel page  
- Payment gateway return URLs → Laravel handlers  
- Billing / Subscription pages → Laravel until SPA built  

---

## 11. Related docs & source paths

| Resource | Path |
|---|---|
| This document | `shipper/docs/SHIPPER_PANEL_COMPLETE_FEATURE_MAPPING.md` |
| Prior matrix draft | `shipper/docs/FEATURE_MAPPING_FUNCTIONAL_SPEC.md` |
| Address Book parity | `shipper/docs/ADDRESS_BOOK_PARITY.md` |
| Product Master parity | `shipper/docs/PRODUCT_MASTER_PARITY.md` |
| Partners parity | `shipper/docs/PARTNERS_PARITY.md` |
| ERP Orders parity | `shipper/docs/ERP_ORDERS_PARITY.md` |
| Search Trucks map parity | `shipper/docs/SEARCH_TRUCKS_MAP_PARITY.md` |
| Create Shipment QA | `shipper/docs/PDS-917-Steps-1-2-QA.md`, `PDS-917-Step-3-QA.md` |
| Price Lists (PDS-935) | `shipper/docs/PDS-935-Lane-Prices-UI-Revamp.md` |
| Support QA (PDS-950) | `shipper/docs/PDS-950-qa-checklist.md`, `MV_Backend_API/miro/Shipper/SupportAndFeedback/PDS-950-PHASE8-RELEASE-SIGNOFF.md` |
| Miro Laravel specs | `MV_Backend_API/miro/Shipper/*/MYVAGON-Shipper-*.md` |
| Laravel web routes | `MV_Backend_API/routes/shipper.php` |
| React API routes | `MV_Backend_API/routes/api/shipper.php` |
| React router | `shipper/src/router.tsx` |
| React API services | `shipper/src/api/services/` |

---

## Change log

| Date | Change |
|---|---|
| 2026-07-20 | Created complete section-wise Feature Mapping + API catalog + Laravel/React comparison |
| 2026-08-12 | Added §2 development status + go-live timeline; refreshed matrix for PDS-937/935/950, Settings, 2FA, Tutorials, Support |
| 2026-08-12 | Reframed §2/§10 around **development** only (removed QA/sign-off from timeline and blockers) |
| 2026-08-12 | Removed **React UI** column from §3 master comparison matrix (Laravel + React API + gap only) |
| 2026-08-12 | Removed Legacy Create Shipment from §3 matrix and §7 module specs (32 modules) |
| 2026-08-12 | Marked **Price Lists (#15)** and **Profile Management (#17)** dev complete |
| 2026-08-12 | Removed Past-Due gate, Load limits, Upgrade modal, Language/timezone (tracked under Shipment); CMS **done**; Notifications **listing pending** |

---

*Update Status columns and §9 API gaps as work ships. Prefer linking PDS/PR tickets in module Comparison rows.*
