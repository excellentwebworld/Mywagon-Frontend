# MYVAGON Shipper Panel — Complete Feature Mapping, API & Comparison Spec

| | |
|---|---|
| **Purpose** | Single source of truth for Laravel → React migration, feature parity, and API coverage |
| **Laravel (production)** | Blade panel — `MV_Backend_API` · `routes/shipper.php` · Miro: `miro/Shipper/` |
| **React (in development)** | SPA — `shipper/` · Vite + React Router · `src/router.tsx` |
| **Shipper API (React backend)** | `MV_Backend_API/routes/api/shipper.php` · Base: `/api/shipper/v1` · Sanctum Bearer |
| **Last updated** | 2026-07-20 |
| **Status keys** | ✅ Done · 🚧 Partial · ❌ Pending · ➖ N/A / Not required |

---

## Table of contents

1. [Architecture overview](#1-architecture-overview)
2. [Master comparison matrix](#2-master-comparison-matrix)
3. [Cross-cutting rules (roles, permissions, gates)](#3-cross-cutting-rules)
4. [React Shipper Panel — app map](#4-react-shipper-panel--app-map)
5. [Shipper API catalog (`/api/shipper/v1`)](#5-shipper-api-catalog)
6. [Module specifications (detailed)](#6-module-specifications-detailed)
7. [React-only / enhanced features](#7-react-only--enhanced-features)
8. [API gaps (needed for remaining modules)](#8-api-gaps-needed-for-remaining-modules)
9. [Migration phases & cutover risks](#9-migration-phases--cutover-risks)
10. [Related docs & source paths](#10-related-docs--source-paths)

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

React today: auth + some module `403` banners only. **Past-due / KYC / info-form SPA gates are missing.**

---

## 2. Master comparison matrix

| # | Module | Laravel | React UI | React API | Gap summary |
|---|---|---|---|---|---|
| 1 | Login & Auth | ✅ | 🚧 | ✅ | Forgot password / register still Laravel links; KYC gates not enforced in SPA |
| 2 | Signup & KYC | ✅ | ❌ | ❌ | No React register/KYC |
| 3 | Onboarding Tour | ✅ | ❌ | ❌ | |
| 4 | Profile Information (questionnaire) | ✅ | ❌ | ❌ | Blocking modal |
| 5 | Dashboard | ✅ | 🚧 | 🚧 | KPI summary partial; schedule/map/board mostly mock |
| 6 | Manage Shipments | ✅ | 🚧 | ✅ | Strong list/actions; some Laravel nuances TBD |
| 7 | Shipment Detail | ✅ | 🚧 | 🚧 | Read API; demo fallbacks; many actions stubbed |
| 8 | Create Shipment | ✅ | 🚧 | ✅ | Wizard live; PDS-917 QA open |
| 9 | Edit Shipment (published) | ✅ | 🚧 | 🚧 | Draft resume only; no full published edit |
| 10 | Legacy Create Shipment | ✅ | ➖ | ➖ | Do not port |
| 11 | Search Available Trucks | ✅ | ✅ | ✅ | Redesigned map/list |
| 12 | Address Book | ✅ | ✅ | ✅ | Redesigned 3-pane |
| 13 | Product Master | ✅ | ✅ | ✅ | + AI import |
| 14 | Partners | ✅ | ✅ | ✅ | + notes/tags/lanes |
| 15 | ERP Orders | ➖ | ✅ | ✅ | React-first |
| 16 | User Management | ✅ | ❌ | ❌ | |
| 17 | Profile Management | ✅ | ❌ | ❌ | `/auth/me` only |
| 18 | Change Password | ✅ | ❌ | ❌ | |
| 19 | Notifications | ✅ | 🚧 | ❌ | Header mock only |
| 20 | Chat | ✅ | ❌ | ❌ | |
| 21 | Subscription + Add-ons | ✅ | ❌ | ❌ | `#subscription` stub; upgrades deep-link Laravel |
| 22 | Billing | ✅ | ❌ | ❌ | `#billing` stub |
| 23 | Account Statement | ✅ | ❌ | ❌ | |
| 24 | Past-Due Invoice gate | ✅ | ❌ | ❌ | Distinct from shipment `past_due` tab |
| 25 | Load limit modals | ✅ | 🚧 | 🚧 | Public check in wizard; private modal TBD |
| 26 | Upgrade modal (global) | ✅ | 🚧 | 🚧 | Module-local only |
| 27 | Support & Feedback | ✅ | ❌ | ❌ | `#support` stub |
| 28 | Tutorials | ✅ | ❌ | ❌ | `#tutorial` stub |
| 29 | Refer MYVAGON | ✅ | ❌ | ❌ | |
| 30 | CMS (Privacy/Terms/About) | ✅ | 🚧 | ❌ | Marketing About only |
| 31 | Public Track Shipment | ✅ | ❌ | ❌ | Guest page |
| 32 | Language & timezone | ✅ | 🚧 | ❌ | FE i18n yes; BE sync TBD |

---

## 3. Cross-cutting rules

### 3.1 Roles

| Role | Behaviour |
|---|---|
| **Primary shipper** | Owns company, subscription, KYC, sub-users |
| **Sub-user (dispatcher)** | Permissions from User Management; inherits parent subscription / past-due / KYC context |
| **Guest** | Public track shipment only |

### 3.2 Sub-user permission groups (Laravel)

- Create Shipment
- Manage Shipments
- Carrier Assignment
- Collaboration
- Control (manage other users)
- Billing
- Company Account Information (view / edit)

Notable flags: `view_only_owned_shipments` / `view_all_existing_shipments`, `view_quotes`, `accept/Reject_partner_request`, `view_company_account_information`, `edit_company_account_information`.

### 3.3 Subscription permission slugs

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

### 3.4 Shipment status lifecycle

```
Draft → Pending → Scheduled → Ready → Past Due → On Trip
     → Fulfilled | Partially Fulfilled | Not Fulfilled | Canceled / Rejected
```

**Pending sub-states:** open bids · availability bids · partner interest · carrier pending.

---

## 4. React Shipper Panel — app map

### 4.1 Project layout

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

### 4.2 Routes

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
| `/erp-orders` | ErpOrders | Protected |

With `basename` set: `/` redirects to `/address-book`.

### 4.3 Sidebar navigation

| Nav item | Target | Status |
|---|---|---|
| Dashboard | `/dashboard` | 🚧 |
| Create Shipment | `/shipments/create` | 🚧 |
| Manage Shipments | `/shipments` | 🚧 |
| Truck Availability (BETA) | `/search-trucks` | ✅ |
| Address Book | `/address-book` | ✅ |
| Product Master | `/products` | ✅ |
| Partners | `/partners` | ✅ |
| ERP Orders | `/erp-orders` | ✅ |
| Subscription | `#subscription` | ❌ stub |
| Billing | `#billing` | ❌ stub |
| Support | `#support` | ❌ stub |
| Tutorial | `#tutorial` | ❌ stub |

### 4.4 React API services ↔ backend

| Service file | API prefix | Module |
|---|---|---|
| (auth in `api/auth`) | `/auth/*` | Login |
| `addressBookService.ts` | `/address-book/*` | Address Book |
| `productMasterService.ts` | `/product-master/*` | Product Master |
| `partnersService.ts` | `/partners/*` | Partners |
| `availabilitiesService.ts` | `/availabilities/*` | Search Trucks |
| `createShipmentService.ts` | `/create-shipment/*` | Create Wizard |
| `shipmentsService.ts` | `/shipments/*` | Manage + Detail |
| `erpOrdersService.ts` | `/erp-orders/*` | ERP Orders |

### 4.5 Auth model (React)

- Login stores Sanctum token; `ProtectedRoute` guards app layout.
- `GET /auth/me` returns profile fields including `kyc_status`, `is_sub_user`, `permissions[]` — **returned but mostly unused in UI**.
- Forgot password / Register deep-link to Laravel (`VITE_LARAVEL_URL`).

---

## 5. Shipper API catalog

**Base URL:** `{host}/api/shipper/v1`  
**Auth:** `Authorization: Bearer {token}` (except login)  
**Middleware (authenticated group):** `auth:sanctum` · `language.manager` · `EnsureShipperUser` · `last.active` · `ApiShipperSubUserRestricted`

### 5.1 Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Login · returns token |
| GET | `/auth/me` | Current shipper profile |
| POST | `/auth/logout` | Revoke token |

### 5.2 Address Book

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

### 5.3 Product Master

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

### 5.4 Partners

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

### 5.5 Availabilities (Search Trucks)

| Method | Path | Purpose |
|---|---|---|
| GET | `/availabilities/` | List (filters, bounds, infinite scroll) |
| GET | `/availabilities/export` | CSV export |
| GET | `/availabilities/{id}` | Detail |
| POST | `/availabilities/{id}/proceed` | Proceed choice |
| GET | `/availabilities/{id}/pending-matches` | Match pending loads |
| POST | `/availabilities/{id}/bids` | Place bid on pending shipment |

### 5.6 Create Shipment (drafts)

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

### 5.7 Shipments (Manage / Detail)

| Method | Path | Purpose |
|---|---|---|
| GET | `/shipments/summary` | KPI / status counts |
| GET | `/shipments/export` | Excel export |
| GET | `/shipments/` | Paginated list |
| GET | `/shipments/{id}` | Detail |
| GET | `/shipments/{id}/cancel-reasons` | Cancel reasons |
| POST | `/shipments/{id}/cancel` | Cancel load |
| POST | `/shipments/bulk-cancel` | Bulk cancel |
| POST | `/shipments/bulk-extend-bid` | Bulk extend bid |
| POST | `/shipments/{id}/offers/{offerId}/accept\|reject\|counter` | Offer actions |
| POST | `/shipments/{id}/invites` | Invite partner |
| POST | `/shipments/{id}/invites/{partnerId}/remind` | Remind |
| DELETE | `/shipments/{id}/invites/{partnerId}` | Withdraw invite |

### 5.8 ERP Orders

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

---

## 6. Module specifications (detailed)

Each module below uses the same checklist fields.

---

### 6.1 Login & Auth

| Field | Detail |
|---|---|
| **Overview** | Sign-in for primary + sub-users; language; session; post-login gates. |
| **Laravel functionalities** | Email/password; EN/GR; Forgot password; inactive primary/sub-user messaging; logout; load sub-user permissions; free plan on first login; KYC/address redirects. |
| **React functionalities** | Login page; validation; token session; logout confirm; EN/EL toggle; ProtectedRoute. |
| **Roles & permissions** | Active primary/sub-user required. |
| **Business rules** | Wrong credentials message; inactive blocks; KYC pending/rejected → Profile; incomplete address after KYC → Profile. |
| **Validation** | Email format; password required. |
| **UI / screens** | Login; Forgot password (Laravel); Inactive modal (Laravel). |
| **Actions** | Login, Logout, Reset password, Change language. |
| **API** | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`. |
| **Dependencies** | Signup/KYC, Profile, Billing, Subscription. |
| **Edge cases** | Concurrent session; unused `permissions` / `kyc_status` on `/me`. |
| **Status** | Laravel ✅ · React 🚧 · API ✅ |
| **Comparison** | React covers happy-path login only. Forgot password & register → Laravel URLs. Post-login KYC/address gates not enforced in SPA. |

---

### 6.2 Signup & KYC

| Field | Detail |
|---|---|
| **Overview** | Registration + email/phone verify + VAT certificate; admin KYC review. |
| **Laravel** | Full signup form; OTP verify; consent; KYC Pending→Accepted/Rejected; admin history. |
| **React** | None (link to Laravel register). |
| **API** | None under `/api/shipper/v1`. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Must remain on Laravel until React signup + KYC APIs exist; or keep hybrid forever for onboarding. |

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
| **React** | Redesigned layout; `GET /shipments/summary` for some KPIs; Schedule / LiveMap / ShipmentBoard / Notifications largely mock (`companyNameDemo`, `mockData`). |
| **API used** | `GET /shipments/summary` only. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | UI redesign ≠ parity. Need live recent shipments, map, trucks widget, notifications feed. |

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
| **Comparison** | Feature-complete core; **PDS-917 QA not signed off**. Private load limit modal may still lag Laravel. |

---

### 6.9 Edit Shipment

| Field | Detail |
|---|---|
| **Overview** | Edit existing load; lock in-progress stops; old vs new itinerary. |
| **Laravel** | Full update table; locked stops; inconvenience warning; Confirm Updated Itinerary. |
| **React** | Draft resume via `?id=` on create wizard; Detail Edit often toast-only; **no published-load edit parity**. |
| **API** | Draft PUT steps only — no dedicated published-edit API surface for SPA. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |
| **Comparison** | Critical ops gap for production cutover. |

---

### 6.10 Legacy Create Shipment

| Field | Detail |
|---|---|
| **Overview** | Old `shipper/shipment/*` Blade flow. |
| **Status** | Laravel ✅ · React ➖ · API ➖ |
| **Comparison** | **Do not migrate.** React wizard replaces it. |

---

### 6.11 Search Available Trucks

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

### 6.12 Address Book

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

### 6.13 Product Master

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

### 6.14 Partners

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

### 6.15 ERP Orders (React-first)

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

### 6.16 User Management

| Field | Detail |
|---|---|
| **Overview** | Dispatcher sub-users + permission matrix + seat limits. |
| **Laravel** | Full CRUD; block/unblock; permission groups; credentials email; `dispatcher_users` limit. |
| **React** | Not started (`mocks/userMgmtData.js` only). |
| **API** | Not in `/api/shipper/v1`. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Required for multi-dispatcher customers before Blade cutover. |

---

### 6.17 Profile Management

| Field | Detail |
|---|---|
| **Overview** | Personal / Company / Operations / KYC tabs; completion %. |
| **Laravel** | Full forms; avatar; KYC upload; sub-user locks. |
| **React** | Header avatar from `/auth/me`; Profile menu → toast. |
| **API** | `/auth/me` read only — no update/KYC endpoints for SPA. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.18 Change Password

| Field | Detail |
|---|---|
| **Overview** | Current / New / Confirm with complexity rules. |
| **Laravel** | Full form in user menu. |
| **React** | None (Laravel reset link from login). |
| **API** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.19 Notifications Listing & Settings

| Field | Detail |
|---|---|
| **Overview** | Bell dropdown; listing; push/email toggles; sidebar badges. |
| **Laravel** | Full listing + settings + deep links + realtime badges. |
| **React** | Header sample notifications; View all toast; Dashboard mock panel. |
| **API** | None. |
| **Status** | Laravel ✅ · React 🚧 · API ❌ |

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
| **React** | Sidebar `#subscription`; module 403s deep-link Laravel plan URL. |
| **API** | None for SPA. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Hybrid acceptable short-term (upgrade opens Laravel). Full SPA later. |

---

### 6.22 Billing

| Field | Detail |
|---|---|
| **Overview** | Invoices, wallet pay, bank transfer receipt, print. |
| **Laravel** | Full Billing History & Invoices. |
| **React** | `#billing` stub. |
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

### 6.24 Past-Due Invoice gate

| Field | Detail |
|---|---|
| **Overview** | Block panel when unpaid past-due invoices exist. |
| **Laravel** | Middleware → Billing + Access Restricted modal. |
| **React** | **Missing.** (Shipment list `past_due` tab is a different concept — overdue pickup, not invoice.) |
| **API** | No SPA past-due check endpoint. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | **Cutover blocker** — revenue/access enforcement. |

---

### 6.25 Load limit modals (private / public)

| Field | Detail |
|---|---|
| **Overview** | Quota exhausted while publishing private/public loads. |
| **Laravel** | Private Load Limit modal; public quota message. |
| **React** | `POST /create-shipment/check-public-limit` + Step 3 banner; private modal TBD. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 |

---

### 6.26 Upgrade (Subscribe) Modal

| Field | Detail |
|---|---|
| **Overview** | Global “feature not in plan” gate. |
| **Laravel** | Shared `#subscribe-modal` everywhere. |
| **React** | Module-local (SAT gate, master banners); no single global component. |
| **Status** | Laravel ✅ · React 🚧 · API 🚧 (403 bodies) |

---

### 6.27 Support & Feedback

| Field | Detail |
|---|---|
| **Overview** | Feedback form + support ticket + Calendly. |
| **Laravel** | Two pages; `feedback_and_support` gate. |
| **React** | `#support` stub. |
| **API** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.28 Tutorials

| Field | Detail |
|---|---|
| **Overview** | YouTube library + contextual help icons. |
| **Laravel** | Full library + section fetch. |
| **React** | `#tutorial` stub. |
| **API** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.29 Refer MYVAGON

| Field | Detail |
|---|---|
| **Overview** | Referral code modal; copy message; credits. |
| **Laravel** | Top-bar promo + Profile code. |
| **React** | None. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |

---

### 6.30 CMS Pages

| Field | Detail |
|---|---|
| **Overview** | Privacy, Terms, About (EN/EL CMS). |
| **Laravel** | CMS-backed pages. |
| **React** | Static Marketing About (dev without basename). |
| **Status** | Laravel ✅ · React 🚧 · API ❌ |

---

### 6.31 Public Track Shipment

| Field | Detail |
|---|---|
| **Overview** | Guest tracking via encrypted link. |
| **Laravel** | `shipper/track-shipment/{id}/{location_id}`. |
| **React** | None — may stay Laravel-hosted. |
| **Status** | Laravel ✅ · React ❌ · API ❌ |
| **Comparison** | Decide: keep Blade public page vs build React public route. |

---

### 6.32 Language & Timezone

| Field | Detail |
|---|---|
| **Overview** | EN/EL locale + default timezone + device token. |
| **Laravel** | Login + in-panel language; set timezone; FCM token. |
| **React** | FE i18n keys; no BE language/timezone sync API used. |
| **Status** | Laravel ✅ · React 🚧 · API ❌ |

---

## 7. React-only / enhanced features

| Feature | Notes |
|---|---|
| **ERP Orders module** | Full order registry + Create Load bridge |
| **Product Master AI Wizard** | Messy CSV → preview → confirm |
| **ERP Orders AI Wizard** | Same pattern for orders |
| **SAT map UX** | Airbnb pill, bounds search, Directions polylines, infinite scroll |
| **Create ↔ SAT/ERP integration** | Prefill + `availability_id` on publish |
| **Partners enhancements** | Notes, tags, preferred, contract lanes, supplier type |
| **Address Book / Product redesign** | Client-approved 3-pane masters |

These are **not** Laravel parity debt — they are intentional React/API advances.

---

## 8. API gaps (needed for remaining modules)

| Domain | Needed for SPA | Suggested endpoints (illustrative) |
|---|---|---|
| Profile / KYC | Profile Management, gates | `GET/PUT /profile`, `POST /kyc`, company/ops forms |
| Sub-users | User Management | `/sub-users` CRUD + permissions + toggle |
| Notifications | Listing + settings + badges | `/notifications`, `/notification-settings`, badge mark-visited |
| Chat | Messages | `/chat/threads`, `/chat/messages`, upload |
| Subscription | Plans / add-ons | `/subscription/plans`, purchase, cancel, auto-pay |
| Billing | Invoices / pay | `/billing/invoices`, pay, bank-receipt, wallet |
| Account statement | Wallet ledger | `/account-statement` |
| Past-due gate | SPA middleware | `GET /auth/access-state` (kyc, past_due, info_form, onboarding) |
| Onboarding | Tour | `POST /onboarding/complete` |
| Support | Feedback/tickets | `/feedback`, `/support` |
| Tutorials | Video library | `/tutorials`, `/tutorials/by-section` |
| CMS | Legal pages | `/cms/{slug}` |
| Refer | Referral modal | `/referral` |
| Edit published shipment | Edit flow | Extend create-shipment or `/shipments/{id}/edit-*` |
| Detail extras | Co-owner, rating, POD, logs, tracking links | Dedicated shipment sub-resources |

---

## 9. Migration phases & cutover risks

### 9.1 Phases

| Phase | Focus | Modules |
|---|---|---|
| **A — Core freight** | Day-to-day ops | Address Book ✅ · Product ✅ · Partners ✅ · SAT ✅ · ERP ✅ · Create 🚧 · Manage 🚧 · Detail 🚧 |
| **B — Account & access** | Hard gates | Auth complete · Signup/KYC · Past-due · Profile · Profile Info · Users · Change Password |
| **C — Monetization** | Revenue | Subscription · Billing · Load limits · Global Upgrade |
| **D — Collaboration** | Engagement | Notifications · Chat · Refer · Support · Tutorials · Onboarding |
| **E — Polish** | Closeout | Dashboard live · Published Edit · CMS · Public Track strategy · Locale sync |

### 9.2 Cutover blockers (must close)

1. Past-due invoice SPA gate  
2. KYC / company address / info-form enforcement  
3. Subscription + Billing path (embed Laravel or build SPA)  
4. User Management for dispatcher customers  
5. Shipment Detail without demo data + critical actions  
6. Published Edit Shipment  
7. Create Shipment PDS-917 QA sign-off  

### 9.3 Acceptable hybrid (short-term)

- Forgot password / Register → Laravel  
- Upgrade Now → Laravel subscription URL  
- Public Track → Laravel page  
- Payment gateway return URLs → Laravel handlers  

---

## 10. Related docs & source paths

| Resource | Path |
|---|---|
| This document | `shipper/docs/SHIPPER_PANEL_COMPLETE_FEATURE_MAPPING.md` |
| Prior matrix draft | `shipper/docs/FEATURE_MAPPING_FUNCTIONAL_SPEC.md` |
| Address Book parity | `shipper/docs/ADDRESS_BOOK_PARITY.md` |
| Product Master parity | `shipper/docs/PRODUCT_MASTER_PARITY.md` |
| Partners parity | `shipper/docs/PARTNERS_PARITY.md` |
| ERP Orders parity | `shipper/docs/ERP_ORDERS_PARITY.md` |
| Search Trucks parity | `shipper/docs/SEARCH_TRUCKS_MAP_PARITY.md` |
| Create Shipment QA | `shipper/docs/PDS-917-Steps-1-2-QA.md`, `PDS-917-Step-3-QA.md` |
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

---

*Update Status columns and §8 API gaps as work ships. Prefer linking PDS/PR tickets in module Comparison rows.*
