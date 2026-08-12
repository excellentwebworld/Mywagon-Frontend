# Shipper Panel — Feature Mapping & Functional Specification

> **Superseded as the primary document.** Use the complete section-wise spec instead:  
> **[`SHIPPER_PANEL_COMPLETE_FEATURE_MAPPING.md`](./SHIPPER_PANEL_COMPLETE_FEATURE_MAPPING.md)**  
> (architecture · master matrix · React app map · full API catalog · module details · gaps · phases)

| Field | Value |
| --- | --- |
| **Document purpose** | Single source of truth for Laravel → React Shipper Panel migration and feature parity |
| **Laravel reference** | Production Blade shipper panel (`MV_Backend_API` web routes `routes/shipper.php`) |
| **React target** | `shipper/` SPA + Shipper API `routes/api/shipper.php` (`/api/shipper/v1/*`) |
| **Supporting specs** | Miro docs `MV_Backend_API/miro/Shipper/*`, module parity docs in `shipper/docs/*` |
| **Last reviewed** | 2026-08-12 (see updated master spec) |
| **Status legend** | ✅ Implemented · 🚧 Partial / In progress · ❌ Not started · ➖ Not required |

---

## How to use this document

1. Treat **Laravel** as the functional reference unless a React redesign (client-approved Blade / PDS ticket) intentionally supersedes UX.
2. For each module, tick **Implementation Status** as React work lands; keep Remarks updated with gaps.
3. Cross-check subscription permission slugs and sub-user permission groups before marking parity complete.
4. Module-level parity checklists (Address Book, Product Master, Partners, ERP Orders, Search Trucks) remain detailed companions — this document is the master index.

---

## 1. Migration progress matrix

| # | Module / Feature | Laravel | React | Notes |
| --- | --- | --- | --- | --- |
| 1 | Login & Auth | ✅ | 🚧 | Login + logout API; missing forgot password, full post-login gates |
| 2 | Signup & KYC | ✅ | ❌ | No React register/KYC flow |
| 3 | Onboarding Tour | ✅ | ❌ | |
| 4 | Profile Information (mandatory questionnaire) | ✅ | ❌ | Blocking modal + reminder |
| 5 | Dashboard | ✅ | 🚧 | Redesigned UI shell; not fully wired to live KPIs/map |
| 6 | Manage Shipments | ✅ | 🚧 | List/filter/cancel/invite/bids via API; some Laravel actions TBD |
| 7 | Shipment Detail (Load Details) | ✅ | 🚧 | Detail API wired; `detailViewModel` still synthesizes demo fallbacks; many actions toast-only |
| 8 | Create Shipment (wizard) | ✅ | 🚧 | 3-step wizard + drafts API live; PDS-917 QA not signed off |
| 9 | Edit Shipment | ✅ | 🚧 | Draft resume via create wizard only; no published-load edit parity |
| 10 | Legacy Create Shipment | ✅ | ➖ | Superseded by React wizard; do not port |
| 11 | Search Available Trucks | ✅ | ✅ | Map/list redesign + live availabilities API |
| 12 | Address Book | ✅ | ✅ | Redesigned master; parity doc Done |
| 13 | Product Master | ✅ | ✅ | Redesigned + AI import; parity doc Done |
| 14 | Partners | ✅ | ✅ | Redesigned master + contract lanes; parity doc Done |
| 15 | ERP Orders | ➖ | ✅ | React-first module (not in classic Laravel panel) |
| 16 | User Management (sub-users) | ✅ | ❌ | |
| 17 | Profile Management | ✅ | ❌ | |
| 18 | Change Password | ✅ | ❌ | |
| 19 | Notifications Listing & Settings | ✅ | ❌ | |
| 20 | Chat / Messages | ✅ | ❌ | |
| 21 | Subscription + Add-ons | ✅ | ❌ | Sidebar placeholder `#subscription` |
| 22 | Billing | ✅ | ❌ | Sidebar placeholder `#billing` |
| 23 | Account Statement | ✅ | ❌ | Menu often hidden in Laravel |
| 24 | Past-Due Invoice gate | ✅ | ❌ | SPA middleware equivalent missing (distinct from Manage Shipments `past_due` status tab, which exists) |
| 25 | Private / Public Load Limit modals | ✅ | 🚧 | Public limit check + Step 3 banner; private limit modal TBD |
| 26 | Upgrade (Subscribe) Modal | ✅ | 🚧 | Module-local gates (e.g. SAT); global modal TBD |
| 27 | Support & Feedback | ✅ | ❌ | Sidebar placeholder `#support` |
| 28 | Tutorials | ✅ | ❌ | Sidebar placeholder `#tutorial` |
| 29 | Refer MYVAGON | ✅ | ❌ | |
| 30 | CMS Pages (Privacy / Terms / About) | ✅ | 🚧 | Marketing About; legal CMS TBD |
| 31 | Public Track Shipment | ✅ | ❌ | Guest tracking page |
| 32 | Language (EN/EL) & timezone | ✅ | 🚧 | i18n present; web language/timezone sync TBD |

---

## 2. Cross-cutting concerns

### 2.1 User roles

| Role | Description |
| --- | --- |
| **Primary shipper** | Company owner account; full plan entitlements; manages sub-users |
| **Sub-user (dispatcher)** | Linked to parent; route/action gated by assigned permission groups |
| **Guest** | Public track shipment only |

### 2.2 Sub-user permission groups (Laravel)

Assigned in User Management; enforced via `web.shipper.permission` / session route map:

- **Create Shipment**
- **Manage Shipments**
- **Carrier Assignment**
- **Collaboration** (e.g. chat, co-owner)
- **Control** (manage other users’ permissions)
- **Billing**
- **Company Account Information** (view / edit company, operations, KYC)

Notable individual flags referenced in Miro:

- `view_only_owned_shipments` / `view_all_existing_shipments`
- `view_quotes`
- `accept/Reject_partner_request`
- `view_company_account_information` / `edit_company_account_information`

### 2.3 Subscription permission slugs (plan + add-ons)

| Slug | Typical gate |
| --- | --- |
| `manage_shipment` | Manage Shipments module |
| `draft_shipment` | Save as draft |
| `allow_multiple_stops` | Add New Order / multi-stop |
| `private_loads` | Public vs Private load type |
| `view_quotes` | Clear vs blurred prices |
| `view_map` | Interactive maps |
| `actual_travelled_route` | Actual GPS route on completed trips |
| `live_gps_shipment_tracking` | Live GPS while on trip |
| `view_electronic_pods` | POD images |
| `rating_and_review_for_transporter` | Rate carrier |
| `send_tracking_links_to_your_customers_per_month` | Recipient tracking links |
| `filter_and_search_in_all_the_modules` | Search / filter / sort |
| `search_available_trucks` | SAT module |
| `create_shipment_from_search_available_truck` | Bid → create shipment |
| `view_matched_trucks_for_availability` | Exact match highlight |
| `count_of_bids_per_month` | Bid action quota |
| `view_current_best_bid_for_a_posted_truck` | Best bid tooltip |
| `view_if_public_bids_have_been_submitted_for_a_posted_truck` | Bids-received tooltip |
| `manage_address_book_master` | Address Book |
| `manage_product_master` | Product Master |
| `partners` | Partner invite / accept |
| `user_management` | Sub-user admin |
| `dispatcher_users` | Seat limit |
| `profile_management` | Profile page |
| `notifications` | Notification listing / dropdown |
| `chat_with_carriers_drivers` | Chat |
| `account_statement` | Billing access |
| `feedback_and_support` | Support & Feedback |
| `manage_erp_orders` | ERP Orders (React/API) |

### 2.4 Global middleware / gates (Laravel web)

| Gate | Behavior |
| --- | --- |
| `auth:shipper` | Must be logged in |
| `web.ShipperKycChecking` | Pending/Rejected KYC → Profile |
| `web.ShipperPastDueInvoice` | Past-due → Billing + Access Restricted |
| `web.ShipperSubUserRestricted` | Sub-user route permissions |
| `web.RequireInfoFormAfterOneMonth` | Mandatory profile questionnaire enforcement |
| `web.shipper.permission` | Per-route subscription/sub-user check |
| KYC / company address incomplete | Force Profile after login |

**React implication:** SPA must replicate these gates client-side (and trust API 403s) — currently only auth + partial subscription banners exist.

### 2.5 React API surface (current)

Base: `/api/shipper/v1`

| Area | Prefix | Status |
| --- | --- | --- |
| Auth | `/auth/login`, `/auth/me`, `/auth/logout` | ✅ |
| Address Book | `/address-book/*` | ✅ |
| Product Master | `/product-master/*` | ✅ |
| Partners | `/partners/*` | ✅ |
| Create Shipment | `/create-shipment/*` | ✅ |
| Shipments | `/shipments/*` | ✅ |
| Availabilities (SAT) | `/availabilities/*` | ✅ |
| ERP Orders | `/erp-orders/*` | ✅ |
| Profile / KYC / Users / Billing / Chat / Notifications / Subscription | — | ❌ Not exposed yet for SPA |

---

## 3. Module specifications

> Template fields match the migration checklist requirements. **Laravel** is always ✅ unless noted. **React** status reflects `shipper/` as of 2026-07-20.

---

### 3.1 Login & Auth

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Login and Auth |
| **Feature Overview** | Sign-in for primary and sub-user accounts, password recovery, language selection, session handling, and post-login redirects/gates. |
| **Functionalities** | Email/password login; password visibility toggle; EN/GR language; Forgot password request + reset; inactive primary flash; inactive sub-user modal; logout; single-session behavior; load sub-user permissions into session; optional free-plan assignment on first login. |
| **User Roles & Permissions** | Primary + sub-user; sub-user must be active; permissions loaded after login. |
| **Business Rules** | Wrong credentials message; inactive profiles blocked; KYC pending/rejected → Profile; incomplete company address after KYC accepted → Profile. |
| **Validation Rules** | Email required + format; password required; forgot-password email required. |
| **UI Components/Screens** | Login page; Forgot password page; Inactive sub-user modal; Reset password (shared). |
| **Actions Available** | Login, Logout, Request reset, Reset password, Change language. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A (account active/inactive). |
| **Notifications & Alerts** | Error toasts/flashes; inactive modal. |
| **API Integration** | Laravel: `shipper.login`, `shipper.login.post`, logout. React: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`. |
| **Dependencies** | Signup/KYC, Profile, Subscription, Past-due invoice. |
| **Edge Cases** | Sub-user inactive; primary inactive; concurrent session kick; missing subscription on first login. |
| **Implementation Status** | Laravel ✅ · React 🚧 (LoginPage + Sanctum auth; forgot password / full post-login KYC-address gates pending) |
| **Remarks/Notes** | Source: `miro/Shipper/LoginAndAuth`. |

---

### 3.2 Signup & KYC

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Signup and KYC |
| **Feature Overview** | Self-registration with email/phone verification, company address, VAT certificate upload, consent, and admin KYC review (Pending / Accepted / Rejected). |
| **Functionalities** | Registration form; verify email/phone OTP; VAT verify; duplicate checks; certificate upload; Terms/Privacy consent; KYC status banners; resubmit on rejection; admin history (admin panel). |
| **User Roles & Permissions** | Guest (signup); primary shipper (KYC); admin (review — out of shipper SPA scope). |
| **Business Rules** | Panel locked until KYC Accepted; Rejected allows re-upload; Pending locks VAT/certificate edits. |
| **Validation Rules** | Required identity/address fields; password match + complexity; phone/email verified; consent required; certificate file rules. |
| **UI Components/Screens** | Register form; OTP/verify steps; KYC upload on Profile. |
| **Actions Available** | Register, Verify email/phone, Submit KYC, Resubmit. |
| **Filters & Search** | N/A |
| **Status Flow** | Pending → Accepted / Rejected → (resubmit) Pending. |
| **Notifications & Alerts** | KYC status messaging on Profile. |
| **API Integration** | Laravel web: `shipper.register.*`, `shipper.email.verify`, `shipper.phone.verify`, `shipper.verify.otp`, VAT/duplicate checks. React: none yet. |
| **Dependencies** | Login, Profile Management, CMS Terms/Privacy. |
| **Edge Cases** | Duplicate company/email/phone; invalid VAT; rejected with reason. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | Admin KYC UI is not part of shipper React migration. |

---

### 3.3 Onboarding Tour

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Onboarding Tour |
| **Feature Overview** | Intro.js guided tour on Dashboard for first-time primary shippers highlighting Address Book, Product Master, Partners, Create/Manage Shipment, Tutorials. |
| **Functionalities** | Auto-start when `onboarding_completed=false`; floating Help Tour; Start/Next/Back/Finish/Skip; expand Master submenu; complete API. |
| **User Roles & Permissions** | Primary shippers (flag-driven). |
| **Business Rules** | Waits for blocking modals (Shipper Information, tutorials, any `.modal`); Skip also marks completed; Finish toast welcome. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | Overlay tour steps; Help Tour button. |
| **Actions Available** | Start, Next, Back, Finish, Skip, Reset (dev/admin). |
| **Filters & Search** | N/A |
| **Status Flow** | Incomplete → Completed. |
| **Notifications & Alerts** | Welcome notification on Finish. |
| **API Integration** | `shipper.complete-onboarding`, `shipper.onboarding-status`, `shipper.reset-onboarding`. |
| **Dependencies** | Dashboard, sidebar modules, Profile Information modal. |
| **Edge Cases** | Modal priority over auto-start; mobile anchors. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.4 Profile Information (mandatory questionnaire)

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Profile Information / Shipper Information |
| **Feature Overview** | Mandatory operational questionnaire (company type, products, volumes, lanes, trucks, challenges, goals) shown as blocking modal and on Profile Operations tab. |
| **Functionalities** | Blocking **Shipper Information** modal (Save / Logout only); reminder **Complete your profile**; standalone profile-info page; multi-select limits. |
| **User Roles & Permissions** | Primary; sub-users inherit owner completion for enforcement. |
| **Business Rules** | Can block onboarding; after 1 month + low completion, enforcement may override past-due redirect priority. |
| **Validation Rules** | Required radios/multi-selects with min/max counts; Other text when selected. |
| **UI Components/Screens** | Modal; reminder modal; Profile Operations tab. |
| **Actions Available** | Save, Logout, Yes/Skip reminder, Update. |
| **Filters & Search** | City multi-selects. |
| **Status Flow** | Incomplete → Complete. |
| **Notifications & Alerts** | Reminder modal. |
| **API Integration** | `shipper.profile-info.*`, `shipper.information.form.store`. |
| **Dependencies** | Profile Management, Onboarding, Past-due middleware. |
| **Edge Cases** | Cannot dismiss mandatory modal without Save/Logout. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.5 Dashboard

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Dashboard |
| **Feature Overview** | Post-login home summarizing shipment counts by status, recent loads, available trucks widget, notifications prompt, and itinerary map for selected load. |
| **Functionalities** | Welcome header; clickable status cards → Manage Shipments with filter; Create New Shipment CTA; recent shipment cards (≤10 non-draft); View Details; Available Trucks widget + See All; Prompt Updates → Notifications; map with `view_map` gate; tutorial icon; onboarding auto-start. |
| **User Roles & Permissions** | `manage_shipment` for View Details; `view_quotes` blur; `view_map` for interactive map; sub-user visibility. |
| **Business Rules** | Drafts counted but excluded from recent list; Partially Fulfilled split badge; Partner badge on assigned partners. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | Status cards; recent list; trucks widget; notifications widget; map; Upgrade modal. |
| **Actions Available** | Navigate by status; open detail; create shipment; upgrade. |
| **Filters & Search** | Status card filters (via navigation). |
| **Status Flow** | Reflects shipment lifecycle counts. |
| **Notifications & Alerts** | Latest notification preview. |
| **API Integration** | Laravel `shipper.home`; map `shipper.get-map-locations`. React: page shell components (QuickActions, KpiStrip, Schedule, LiveMap, ShipmentBoard, Notifications) — largely presentation / demo wiring. |
| **Dependencies** | Manage Shipments, SAT, Notifications, Subscription, Onboarding. |
| **Edge Cases** | Empty shipper; no quote → N/A; locale singular/plural. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | React dashboard redesign differs from Laravel layout — still need live data parity for counts, recent loads, map, and gates. |

---

### 3.6 Manage Shipments

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Manage Shipments |
| **Feature Overview** | Command center for all loads: visibility tabs, status tabs with counts, search/filter/sort, table actions, cancel, export, row expansions for bids/partners. |
| **Functionalities** | All / Private / Public loads; status tabs (Active, Pending, Scheduled, Ready, Past Due, On Trip, Draft, Fulfilled, Partially Fulfilled, Not Fulfilled, Canceled); filter modal (carrier, product, type, truck, pickup/dropoff radius, trip length, price, pickup window); sort modal; filter chips; table columns (Load ID, Order ID, Pickup, Dropoff, Type, Status, Price, Transporter, Actions); View/Edit/Delete; View all orders panel; cancel with reasons; export; tutorial. |
| **User Roles & Permissions** | `manage_shipment`; `filter_and_search_in_all_the_modules`; `view_quotes`; owned vs all shipments for sub-users. |
| **Business Rules** | Active aggregates pending→on trip; drafts auto-delete after 10 days / Info Incomplete; Public Beta tag; Ready countdown; High Priority badge; draft opens edit not detail. |
| **Validation Rules** | Filter date ranges; cancel reason required. |
| **UI Components/Screens** | List page; Filter/Sort modals; Cancel modal; Order list panel; Upgrade/Subscribe modals. |
| **Actions Available** | View, Edit, Cancel/Delete, Export, Accept/Decline/Counter bids (via detail/expansion), Invite carrier (React), Bulk cancel/extend bid (API). |
| **Filters & Search** | Header search; filter modal; sort modal; KPI chips (React). |
| **Status Flow** | Pending → Scheduled → Ready → Past Due / On Trip → Fulfilled / Partially / Not Fulfilled / Canceled; Draft parallel. |
| **Notifications & Alerts** | Sidebar badges; upgrade prompts. |
| **API Integration** | Laravel `shipper.manage-shipment.*`. React: `GET /shipments`, summary, export, cancel, offers accept/reject/counter, invites, bulk. |
| **Dependencies** | Shipment Detail, Edit, Product Master, Chat, Subscription, SAT. |
| **Edge Cases** | Multi-driver On Trip hides edit; blurred prices; subscription-blocked search. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | React UI is redesigned (KPI strip, row expansion). Confirm full bid/partner/negotiation/co-owner parity vs Laravel detail. |

---

### 3.7 Shipment Detail (Load Details)

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Shipment Detail |
| **Feature Overview** | Operational hub for one published load: timeline, partner interest, availability bids, open bids, stops, map, POD, carrier card, logs, tracking links, co-owners, rating. |
| **Functionalities** | Header Load ID + status + owners; actions (tracking links, logs, bids history, edit, delete, assign co-owner); status timeline; Interested Partners / Availability Bids / Carrier Bids tables (Accept, Decline, Counter, History, Chat, Withdraw); stop cards + POD lightbox; route map (suggested/actual/play); shipment summary (vehicle, cargo, quote, type, negotiation, notes, journey); assigned carrier; rating after fulfillment; cancel with fee notice on public scheduled. |
| **User Roles & Permissions** | See subscription slugs in §2.3; collaboration permissions for chat/co-owner. |
| **Business Rules** | Drafts do not use this page; one accepted assignment drives On Trip; counter-bid may lock; POD gated; Manually Executed Trip banner when no GPS. |
| **Validation Rules** | Counter price; cancel reason; rating stars/text; tracking email format. |
| **UI Components/Screens** | Detail page; Logs; Bids History; Negotiation History; Counter-Offer; Tracking Links; Co-owner; Cancel; Ratings; Upgrade. |
| **Actions Available** | View, Edit, Cancel, Accept/Decline/Counter bids, Invite/Remind/Withdraw, Assign co-owner, Share tracking, Rate, Chat. |
| **Filters & Search** | N/A (single load). |
| **Status Flow** | Full lifecycle timeline including POD and payment states. |
| **Notifications & Alerts** | Unread chat badge; upgrade prompts. |
| **API Integration** | Laravel `shipper.manage-shipment.show` + bid/partner endpoints. React: `GET /shipments/{id}` + offer/invite/cancel endpoints; UI cards present (CommandHeader, Stops, Carrier, ShareTracking, ActivityLog, etc.). |
| **Dependencies** | Manage Shipments, Edit, Chat, Subscription, User Management (co-owners). |
| **Edge Cases** | Multi-driver edit lock; blurred quotes; gated map/POD/GPS. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Redesigned React detail — map feature completeness (actual route, live GPS, bid tables) against Laravel before marking ✅. |

---

### 3.8 Create Shipment

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Create Shipment |
| **Feature Overview** | Multi-step wizard to publish freight: order/product/stops → itinerary/map → truck, public/private, pricing, partners, tracking, notes → publish or draft. |
| **Functionalities** | Order ID; product tree + inline Create SKU; qty/weight/units; pickup/delivery with Address Book + inline Create Location; date/time ranges; Add Product / Add New Order; itinerary table + map; truck type/category; Public/Private; Quote + AI Suggested Price; partners; tracking links; notes; Save Draft; publish success; SAT availability context; ERP orders prefill (React). |
| **User Roles & Permissions** | Create Shipment sub-user perms; `draft_shipment`; `allow_multiple_stops`; `private_loads`; `view_map`; `view_quotes`; public/private quotas. |
| **Business Rules** | Pickup before delivery; no same-location P/D; no conflicting times; public limit message; private load limit modal; drafts expire (see Manage). |
| **Validation Rules** | Required order/product/qty/weight/locations/dates/truck; order ID max length; range end after start. |
| **UI Components/Screens** | Step 1 Details; Step 2 Itinerary; Step 3 Finalize (React); Create Location modal; Create SKU modal; Private Load Limit; Upgrade; Availability context bar. |
| **Actions Available** | Create, Draft, Validate, Publish, Back/Next, AI price, Check public/private limits. |
| **Filters & Search** | Product search; location search tabs My/Customer. |
| **Status Flow** | Draft → Pending (published). |
| **Notifications & Alerts** | Success modal; limit/upgrade modals. |
| **API Integration** | Laravel `shipper.shipment-new.*`. React: `/create-shipment/drafts` step save + publish + AI price + public limit. |
| **Dependencies** | Product Master, Address Book, Partners, SAT, ERP Orders, Subscription. |
| **Edge Cases** | SAT prefill; ERP multi-order; quota exhausted mid-flow. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Core wizard + API live; see `PDS-917` QA docs (checklist still open). Legacy Blade create still exists separately (§3.10). |

---

### 3.9 Edit Shipment

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Edit Shipment |
| **Feature Overview** | Update existing load: order table with locked in-progress stops, itinerary old vs new comparison, finalize truck/price/partners, transporter inconvenience warning. |
| **Functionalities** | Pre-filled rows; lock stops in progress; Add Product/Order; Update confirmation modal; Updated vs Old Itinerary tabs; Keep Old / Confirm Updated; finalize panel; Cancel discard. |
| **User Roles & Permissions** | Same create gates; edit visibility by status (hidden fulfilled/canceled/etc.; On Trip single-driver only). |
| **Business Rules** | Warning before update on scheduled/matched; locked rows immutable; carriers may need re-accept. |
| **Validation Rules** | Same as create for editable rows. |
| **UI Components/Screens** | Update Order Details; Edit Itinerary; Finalize; confirmation modal. |
| **Actions Available** | Update, Continue, Confirm itinerary, Keep old, Cancel. |
| **Filters & Search** | Same pickers as create. |
| **Status Flow** | Remains in lifecycle; may return toward Pending acceptance. |
| **Notifications & Alerts** | Success; upgrade; inconvenience modal. |
| **API Integration** | Laravel `shipper.manage-shipment.edit`, continue update, edit-itinerary. React: no edit flow yet. |
| **Dependencies** | Manage Shipments, Create Shipment shared pickers. |
| **Edge Cases** | Multi-driver On Trip; partially progressed itinerary. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Draft resume via `/shipments/create?id=` only. Detail Edit is toast-only. Published-load edit (locked stops, old/new itinerary) not ported. High priority gap. |

---

### 3.10 Legacy Create Shipment

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Legacy Create Shipment |
| **Feature Overview** | Older `shipper/shipment/*` multi-post wizard still linked from some Blade paths. |
| **Functionalities** | Order details → itinerary; draft; SAT prefill; private limit. |
| **Implementation Status** | Laravel ✅ · React ➖ Not Required |
| **Remarks/Notes** | Do **not** migrate. React uses Create Shipment wizard only. |

---

### 3.11 Search Available Trucks

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Search Available Trucks (SAT) |
| **Feature Overview** | Discover carrier-posted truck availability; filter/sort; bid via new shipment or match pending load. |
| **Functionalities** | Public/Private availability tabs; search/filter/sort; Bid → Proceed Create New or Choose Pending; match-load exact highlight; booking request; Create Shipment prefill; (React) map pins, SearchPill, infinite scroll, map-bounds search, cargo filters, export, subscription gate. |
| **User Roles & Permissions** | `search_available_trucks` + filter/search + quote/bid/match/create-from-SAT slugs (§2.3). |
| **Business Rules** | Active non-expired only; duplicate bid blocked; booking creates availability bid pending carrier approval. |
| **Validation Rules** | Filter radii/prices/dates; bid payload. |
| **UI Components/Screens** | List (Laravel table / React map+list); Filter/Sort; Proceed modal; Match pending; Booking drawer; SubscriptionGateModal. |
| **Actions Available** | Search, Filter, Sort, Bid, Match, Create shipment, Export. |
| **Filters & Search** | Truck type, dates, pickup/dropoff+radius, stops, carrier, price; React quick chips. |
| **Status Flow** | Availability → bid pending → accepted on Manage/Detail. |
| **Notifications & Alerts** | Availability alerts; upgrade; premium toast. |
| **API Integration** | Laravel `shipper.search-available-truck.*`. React: `/availabilities/*`. |
| **Dependencies** | Create Shipment, Manage Shipments, Subscription. |
| **Edge Cases** | Mock mode `VITE_USE_SEARCH_TRUCKS_MOCK`; Directions fallback. |
| **Implementation Status** | Laravel ✅ · React ✅ |
| **Remarks/Notes** | See `SEARCH_TRUCKS_MAP_PARITY.md`. UX redesigned vs Blade table. |

---

### 3.12 Address Book

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Address Book |
| **Feature Overview** | Reusable My / Customer locations with company grouping, contacts, amenities, preferred times, map geocoding; used by Create Shipment. |
| **Functionalities** | List tabs/directory; create/edit/view/delete (soft); duplicate check; company create; amenities; time ranges; search; export (React); archive/restore (React redesign); 4-step wizard (React). |
| **User Roles & Permissions** | `manage_address_book_master`; `filter_and_search_in_all_the_modules`. |
| **Business Rules** | Unique location name per shipper+company; soft delete; historical shipments keep snapshot. |
| **Validation Rules** | Required type, name, company, VAT, address, lat/lng, city, postal; phone/email optional with format; postal 2–8; name max 25. |
| **UI Components/Screens** | List; Create/Edit forms; View; Company modal; Duplicate warning. |
| **Actions Available** | Create, View, Edit, Delete/Archive, Restore, Export, Check duplicate. |
| **Filters & Search** | Search by name/address/city/postal/phone/email; directory facets (React). |
| **Status Flow** | Active ↔ Archived (React). |
| **Notifications & Alerts** | Success toasts; upgrade for search. |
| **API Integration** | Laravel `shipper.address.*`. React: `/address-book/*`. |
| **Dependencies** | Create Shipment, ERP Orders inline location. |
| **Edge Cases** | Add under existing company locks company/VAT; Google Places required for coords. |
| **Implementation Status** | Laravel ✅ · React ✅ |
| **Remarks/Notes** | Client-approved redesign — `ADDRESS_BOOK_PARITY.md`. |

---

### 3.13 Product Master

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Product Management / Product Master |
| **Feature Overview** | Catalog Category → Type → SKU for shipment product selection; import/export; (React) AI wizard, types grid, bulk archive. |
| **Functionalities** | Tree/list; add type; add SKU; edit; delete cascade type→SKUs; toggle status; bulk import Excel; export index/template; search; AI transform/confirm-import (React). |
| **User Roles & Permissions** | `manage_product_master`; filter/search slug. |
| **Business Rules** | No duplicate category+type; no duplicate type+sku_name; inactive parents hide add SKU; import skips invalid/dupe rows. |
| **Validation Rules** | SKU name max 50; SKU# max 15; xlsx/xls only. |
| **UI Components/Screens** | Tree (Laravel) / 3-pane (React); Add/Edit modals; Import; AI Wizard; Types grid. |
| **Actions Available** | Create, Edit, Delete, Toggle, Import, Export, Bulk archive, AI import. |
| **Filters & Search** | Search; facet All/Active/Inactive/Unmapped/category (React). |
| **Status Flow** | Active / Inactive. |
| **Notifications & Alerts** | Success messages; 403 banner. |
| **API Integration** | Laravel `shipper.product.*`. React: `/product-master/*`. |
| **Dependencies** | Create Shipment, Manage filter product type, ERP quick SKU. |
| **Edge Cases** | Bilingual category/type labels; import requires both SKU name+number (Laravel constraint). |
| **Implementation Status** | Laravel ✅ · React ✅ |
| **Remarks/Notes** | `PRODUCT_MASTER_PARITY.md`. |

---

### 3.14 Partners

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Partners |
| **Feature Overview** | Invite carriers/freelancers/(React) shippers; accept/decline requests; manage network; suggestions; preferred/notes/tags/contract lanes (React redesign). |
| **Functionalities** | My Partners / Requests; invite by email/phone/Unique ID; suggestions; delete; accept/decline; search; partner limit blur; (React) suspend, preferred, notes, tags, contract lanes, KPI facets. |
| **User Roles & Permissions** | `partners`; sub-user accept/reject; partner seat limits via plan/add-ons. |
| **Business Rules** | At least one identifier required; Unique ID 9 uppercase alnum; accept counts toward limit; suggestions from completed loads. |
| **Validation Rules** | Partner type required; email lowercase; phone min 8; Unique ID pattern. |
| **UI Components/Screens** | List tabs; Add Partner; Upgrade limit modal; (React) 3-pane + invite. |
| **Actions Available** | Invite, Accept, Decline, Delete, Suspend/Reactivate, Toggle preferred, Notes/Tags, Contract lanes. |
| **Filters & Search** | Search; status/capability facets (React). |
| **Status Flow** | Invited → Active / Declined; Suspended. |
| **Notifications & Alerts** | Partner request deep link to Requests tab. |
| **API Integration** | Laravel `shipper.partners.*`. React: `/partners/*`. |
| **Dependencies** | Subscription, private loads, Shipment Detail Partner badge. |
| **Edge Cases** | Limit reached on accept; blurred excess partners. |
| **Implementation Status** | Laravel ✅ · React ✅ |
| **Remarks/Notes** | `PARTNERS_PARITY.md` — React is enhanced vs classic Blade. |

---

### 3.15 ERP Orders (React-first)

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | ERP Orders |
| **Feature Overview** | Order registry to plan loads from ERP/customer orders; AI CSV import; create load into Create Shipment wizard. Not a classic Laravel Blade module. |
| **Functionalities** | KPI filters; search; high priority; CRUD unplanned; AI import wizard; create load multi-select; export (deferred); quick location/SKU. |
| **User Roles & Permissions** | `manage_erp_orders`. |
| **Business Rules** | Status computed from linked shipment; edit locked when planned/on-trip/completed; upsert on same Order ID for unplanned. |
| **Validation Rules** | Order form fields; AI row accept/reject/edit. |
| **UI Components/Screens** | List; Create/Edit modal; AI Wizard; quick modals. |
| **Actions Available** | Create, Edit, Delete, Import, Create Load, Export (stub). |
| **Filters & Search** | KPI status; high priority; search. |
| **Status Flow** | Unplanned → Planned → On Trip → Completed / Canceled. |
| **Notifications & Alerts** | 403 banner; toasts. |
| **API Integration** | `/erp-orders/*`. |
| **Dependencies** | Address Book, Product Master, Create Shipment. |
| **Edge Cases** | Re-import updates unplanned; planned fails with row error. |
| **Implementation Status** | Laravel ➖ · React ✅ |
| **Remarks/Notes** | `ERP_ORDERS_PARITY.md`. Track as React capability, not Laravel parity item. |

---

### 3.16 User Management

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | User Management (Dispatcher Sub-users) |
| **Feature Overview** | Create/edit/block/delete sub-users; assign permission groups; enforce dispatcher seat limits. |
| **Functionalities** | User table; Add New User; Manage/Edit permissions; Select All; dependent permission auto-select; status toggle; delete; search; upgrade/limit modals; credentials email on create. |
| **User Roles & Permissions** | `user_management`; `dispatcher_users` limit; Control group for managing others. |
| **Business Rules** | Main account row no actions; unique email/phone; random password emailed; KYC accepted inherited; excess users disabled on plan downgrade. |
| **Validation Rules** | Required name/email/phone; ≥1 permission; email unique. |
| **UI Components/Screens** | List; Create/Edit permissions pages; Change Status confirm; Upgrade/Dispatcher limit modals. |
| **Actions Available** | Create, Edit, Delete, Block/Unblock, Search. |
| **Filters & Search** | Header search (subscription gated). |
| **Status Flow** | Active ↔ Blocked. |
| **Notifications & Alerts** | Email credentials; upgrade modals. |
| **API Integration** | Laravel `shipper.sub-users.*`. React: none. |
| **Dependencies** | Subscription, Profile company perms, Assign Co-owner. |
| **Edge Cases** | Seat limit on create; cannot edit self main row. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | Critical for multi-dispatcher customers. |

---

### 3.17 Profile Management

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Profile Management |
| **Feature Overview** | Personal, company registration, operations questionnaire, KYC; completion %; referral/unique IDs. |
| **Functionalities** | Avatar upload; 4 tabs; personal update; company address Places; KYC VAT/certificate; operations mandatory+extended; restricted panels for sub-users; verified badge at 100%. |
| **User Roles & Permissions** | `profile_management`; view/edit company account info for sub-users. |
| **Business Rules** | Email/phone locked after set; KYC tab default until accepted; VAT locked pending/accepted; address banner until complete. |
| **Validation Rules** | Required personal/company fields; image types max 5MB; KYC certificate rules. |
| **UI Components/Screens** | Profile page tabs; Access Restricted panels. |
| **Actions Available** | View, Update personal/company/ops/KYC. |
| **Filters & Search** | N/A |
| **Status Flow** | KYC Pending/Accepted/Rejected; completion %. |
| **Notifications & Alerts** | Address missing banner; KYC banners. |
| **API Integration** | Laravel profile/KYC update routes. React: `/auth/me` only. |
| **Dependencies** | Signup/KYC, Profile Information, User Management, Refer. |
| **Edge Cases** | Sub-user locked tabs; rejected KYC resubmit. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.18 Change Password

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Change Password |
| **Feature Overview** | Authenticated password update for primary and sub-users. |
| **Functionalities** | Current / New / Confirm; complexity rules; submit. |
| **User Roles & Permissions** | Any logged-in shipper/sub-user. |
| **Business Rules** | Current must match; sub-user changes own only. |
| **Validation Rules** | Current 8–15; new complexity (upper, lower, number, special); confirm match. |
| **UI Components/Screens** | Change Password form. |
| **Actions Available** | Update password. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Validation errors. |
| **API Integration** | Laravel `shipper.update.password`. React: none. |
| **Dependencies** | Auth. |
| **Edge Cases** | Wrong current password. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.19 Notification Listing & Settings

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Notifications Listing and Settings |
| **Feature Overview** | In-app notification history, header dropdown, push/email preference toggles, sidebar badges. |
| **Functionalities** | Bell dropdown; View all listing; deep links by type; settings toggles (All master + categories); mark badge visited; realtime badge updates. |
| **User Roles & Permissions** | `notifications`; deep links need target module perms. |
| **Business Rules** | Settings record auto-created; disabled channels suppress outbound; dropdown subset vs full list. |
| **Validation Rules** | Toggle 0/1. |
| **UI Components/Screens** | Dropdown; Listing page; Settings page; Premium Feature upgrade. |
| **Actions Available** | View, Navigate deep link, Update settings, Mark visited. |
| **Filters & Search** | Pagination on listing. |
| **Status Flow** | Unread badges → cleared on visit. |
| **Notifications & Alerts** | Self (meta). |
| **API Integration** | Laravel notifications routes + badge endpoints. React: none (dashboard widget is UI shell). |
| **Dependencies** | All alerting modules, Subscription. |
| **Edge Cases** | Deep link without module entitlement → upgrade. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.20 Chat

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Chat / Messages |
| **Feature Overview** | Two-panel messenger with carriers, freelancers, company drivers, MYVAGON Support; entry from top bar or shipment/bid actions. |
| **Functionalities** | Conversation list + search; thread; send text; voice upload (Laravel); read receipts; realtime; composer hidden without qualifying relationship; Admin always allowed. |
| **User Roles & Permissions** | `chat_with_carriers_drivers`; sub-user chat routes. |
| **Business Rules** | One thread per counterparty; composer only with qualifying shipment/bid/partner/admin context. |
| **Validation Rules** | Non-empty message; voice upload constraints. |
| **UI Components/Screens** | Messages inbox; shipment-context chat; Upgrade modal. |
| **Actions Available** | Open chat, Send, Read, Upload voice, Search conversations. |
| **Filters & Search** | Conversation name search. |
| **Status Flow** | Unread → read. |
| **Notifications & Alerts** | Message notifications. |
| **API Integration** | Laravel `shipper.chat.*`. React: none. |
| **Dependencies** | Shipment Detail bids, Subscription, Notifications. |
| **Edge Cases** | Inactive counterparty redirect; no composer. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.21 Subscription + Add-ons

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Subscription and Add-ons |
| **Feature Overview** | Compare plans (monthly/yearly), upgrade/cancel, auto-pay, purchase recurring/one-time add-ons, view purchased add-ons. |
| **Functionalities** | Plan cards; feature checklists; current plan summary (users, renewal, days left); Cancel Plan; Enable Auto Pay; add-on purchase modal with proration/VAT; purchased add-ons grid cancel. |
| **User Roles & Permissions** | Billing sub-user perms; seat/feature limits enforced platform-wide. |
| **Business Rules** | Prices by tier+interval; recurring prorated; access until period end on cancel; sub-users inherit parent plan. |
| **Validation Rules** | Payment/VAT flows; quantity for one-time. |
| **UI Components/Screens** | Subscription page; purchase modal; VAT modal; Upgrade modal (global). |
| **Actions Available** | Upgrade, Cancel plan, Buy add-on, Cancel add-on, Toggle auto-pay, Contact us. |
| **Filters & Search** | Monthly/Yearly toggle. |
| **Status Flow** | Free/Paid → Cancelled (period end). |
| **Notifications & Alerts** | Invoice notifications. |
| **API Integration** | Laravel `shipper.subscription.*`, AddonController. React: sidebar `#subscription` only. |
| **Dependencies** | Billing, Past-due, all gated modules. |
| **Edge Cases** | Wallet applied; webhook success/fail. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | Some React modules deep-link to Laravel subscription URL for upgrades. |

---

### 3.22 Billing

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Billing |
| **Feature Overview** | Invoice history, pay by card/wallet/bank transfer, credit balance, download/print invoices, past-due enforcement UI. |
| **Functionalities** | Overdue banner; credit balance; date filter; tabs All/Pending/Paid/Rewards; Pay Now; Pay Using Wallet; Bank Transfer receipt upload; View Invoice; Print. |
| **User Roles & Permissions** | `account_statement`; filter/search for dates; past-due middleware. |
| **Business Rules** | Hide Pay Now while bank receipt under review; wallet only if balance covers; rewards = credit deposits. |
| **Validation Rules** | Receipt PDF/JPG/PNG max 5MB; date range. |
| **UI Components/Screens** | Billing list; Bank Transfer modal; Invoice detail; Access Restricted modal. |
| **Actions Available** | Filter, Pay, Upload receipt, View/Print invoice. |
| **Filters & Search** | From/To dates; tabs. |
| **Status Flow** | Pending → Under Process → Paid. |
| **Notifications & Alerts** | Overdue banner; invoice notifications. |
| **API Integration** | Laravel subscription billing routes. React: `#billing` placeholder. |
| **Dependencies** | Subscription, Past-due, Wallet/Referrals. |
| **Edge Cases** | Rejected receipt restores Pay Now. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.23 Account Statement

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Account Statement |
| **Feature Overview** | Wallet ledger (credits/debits) with download and date filter. Menu link often commented out in Laravel. |
| **Functionalities** | Balance; date filter; transaction table; Download All. |
| **User Roles & Permissions** | Filter gated by `filter_and_search_in_all_the_modules`. |
| **Business Rules** | Negative amounts styled red. |
| **Validation Rules** | Date range. |
| **UI Components/Screens** | Account Statement page. |
| **Actions Available** | Filter, Download. |
| **Filters & Search** | From/To. |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Upgrade on restricted filter. |
| **API Integration** | Laravel `shipper.account-statement`, download, filter. React: none. |
| **Dependencies** | Billing, Refer MYVAGON. |
| **Edge Cases** | Empty statement. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | Confirm product need before React port (menu may be hidden). |

---

### 3.24 Past-Due Invoice Blocking

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Past-Due Invoice Gate |
| **Feature Overview** | Restricts panel when unpaid past-due invoices exist; allows Billing/Profile. |
| **Functionalities** | Middleware redirect; Access Restricted modal; Billing overdue banner; session flag. |
| **User Roles & Permissions** | Applies to primary + sub-users (parent invoices). |
| **Business Rules** | Info-form enforcement can take priority over past-due redirect. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | Access Restricted modal; Billing banner. |
| **Actions Available** | Pay Now → Billing. |
| **Filters & Search** | N/A |
| **Status Flow** | Past-due → Paid → unlock. |
| **Notifications & Alerts** | Modal + banner. |
| **API Integration** | Laravel middleware `web.ShipperPastDueInvoice`. React: must implement equivalent. |
| **Dependencies** | Billing, Profile Information. |
| **Edge Cases** | Sub-user parent past-due; modal flag cleared on logout. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | Security/compliance critical for SPA. |

---

### 3.25 Private / Public Load Limit

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Load Limit Modals |
| **Feature Overview** | Quota exhaustion UX when private (or public) load count for billing cycle is reached at publish. |
| **Functionalities** | Private load limit modal (usage line, save draft advice, Upgrade Plan / Maybe Later); public limit check API. |
| **User Roles & Permissions** | Plan/add-on quotas. |
| **Business Rules** | Distinct from Upgrade modal (feature missing vs quota exhausted). |
| **Validation Rules** | Server-side limit check before publish. |
| **UI Components/Screens** | Load Limit Reached modal. |
| **Actions Available** | Maybe Later, Upgrade Plan (new tab add-ons). |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Modal. |
| **API Integration** | Laravel `check-private-limit` / `check-public-limit`. React: `POST /create-shipment/check-public-limit`; private limit UX TBD. |
| **Dependencies** | Create Shipment, Subscription. |
| **Edge Cases** | User loses form if navigates to upgrade without draft. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Ensure private limit modal parity in wizard. |

---

### 3.26 Upgrade (Subscribe) Modal

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Upgrade / Subscribe Modal |
| **Feature Overview** | Global gate when feature not in plan: Remind me later / Upgrade Now → Subscription. |
| **Functionalities** | Static backdrop; shared layout modal; used across modules; also on public tracking for gated features. |
| **User Roles & Permissions** | Triggered by missing subscription permission. |
| **Business Rules** | Cannot dismiss by outside click. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | `#subscribe-modal` (Laravel); React module-local gates (e.g. SAT SubscriptionGateModal, Product/Partners banners). |
| **Actions Available** | Remind later, Upgrade Now. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Modal message. |
| **API Integration** | Client-side from permission checks / 403. |
| **Dependencies** | Subscription page. |
| **Edge Cases** | Multiple triggers same page. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Consolidate global upgrade UX in React. |

---

### 3.27 Support & Feedback

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Support and Feedback |
| **Feature Overview** | Feedback form with attachments and separate support ticket form; Calendly schedule widget on feedback. |
| **Functionalities** | Feedback: App of Reference locked, type, category, title, description, ≤3 images; Support: email, phone, notes; Cancel/Create. |
| **User Roles & Permissions** | `feedback_and_support`. |
| **Business Rules** | Images only; max 3; shipper as feedbackable/supportable. |
| **Validation Rules** | Required fields; email format; phone 8–10 digits. |
| **UI Components/Screens** | Feedback page; Support page; Calendly badge; Upgrade. |
| **Actions Available** | Create feedback, Create ticket, Cancel. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Success toasts. |
| **API Integration** | Laravel `shipper.feedback.*`, `shipper.support.*`. React: `#support` placeholder. |
| **Dependencies** | Admin categories; Subscription. |
| **Edge Cases** | Fourth image blocked. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.28 Tutorials

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Tutorials |
| **Feature Overview** | Admin-managed YouTube library by module + contextual help icons on module pages. |
| **Functionalities** | Expandable module/topic table; video modal; contextual fetch by section; Overview-only for Create Shipment contextual; Manage uses Create videos except Overview. |
| **User Roles & Permissions** | No subscription gate on library. |
| **Business Rules** | Locale EN/EL topic titles; YouTube ID parse. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | Tutorials page; Video Tutorial modal. |
| **Actions Available** | Browse, Play, Close. |
| **Filters & Search** | Expand/collapse modules. |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Loading/error empty states. |
| **API Integration** | Laravel `shipper.tutorials`, `shipper.get-tutorial-by-section`. React: `#tutorial` placeholder. |
| **Dependencies** | Admin tutorials; Onboarding. |
| **Edge Cases** | Empty section message. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.29 Refer MYVAGON

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Refer MYVAGON |
| **Feature Overview** | Share referral code/message to earn credit points; shown in top bar and Profile. |
| **Functionalities** | Modal with code + copy; Copy Referral Message; help link; signup optional referral field. |
| **User Roles & Permissions** | Authenticated shippers. |
| **Business Rules** | Credit points from admin config; unique code per shipper. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | Refer modal; Profile referral display. |
| **Actions Available** | Copy code, Copy message, Open help. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | Copy success/fail toasts. |
| **API Integration** | Client copy; signup accepts code. React: none. |
| **Dependencies** | Signup, Account Statement/Billing wallet. |
| **Edge Cases** | Missing code → N/A. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | — |

---

### 3.30 CMS Pages

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | CMS Pages |
| **Feature Overview** | Read-only Privacy Policy, Terms & Conditions, About Us (and related CMS types) in EN/EL. |
| **Functionalities** | User menu links; registration consent links open Terms/Privacy; locale-based body. |
| **User Roles & Permissions** | Authenticated for in-panel; guests for registration links. |
| **Business Rules** | Admin-published latest content; no shipper edit. |
| **Validation Rules** | N/A |
| **UI Components/Screens** | CMS content pages. |
| **Actions Available** | View. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | N/A |
| **API Integration** | Laravel `shipper.about-us`, `privacy-policy`, `terms-condition`. React: Marketing About page (not CMS-backed legal pages). |
| **Dependencies** | Signup consent; Notifications terms deep link. |
| **Edge Cases** | Empty CMS body. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | Wire Privacy/Terms to CMS or static approved content. |

---

### 3.31 Public Track Shipment

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Public Track Shipment |
| **Feature Overview** | Guest tracking page via encrypted shipment+location link; map/POD gated by owning shipper plan. |
| **Functionalities** | Load ID + status; itinerary; map; timeline; co-owners; POD gated; Upgrade modal for gated features; EN/EL. |
| **User Roles & Permissions** | Guest viewer; permissions evaluated on owning shipper subscription. |
| **Business Rules** | Invalid/tampered IDs fail; distinct from Past Due status tab. |
| **Validation Rules** | Encrypted ID decrypt. |
| **UI Components/Screens** | Lightweight tracking page (no sidebar). |
| **Actions Available** | View tracking; Upgrade Now (gated). |
| **Filters & Search** | N/A |
| **Status Flow** | Mirrors shipment lifecycle for scoped stops. |
| **Notifications & Alerts** | Upgrade modal. |
| **API Integration** | Laravel `shipper.track-shipment`. React: none. |
| **Dependencies** | Shipment Detail tracking link generation; Subscription. |
| **Edge Cases** | Tampered link; gated map without login upgrade path. |
| **Implementation Status** | Laravel ✅ · React ❌ |
| **Remarks/Notes** | May remain Laravel-hosted if links already public; decide hosting strategy. |

---

### 3.32 Language & Timezone

| Field | Detail |
| --- | --- |
| **Module/Feature Name** | Language (EN/EL) & Default Timezone |
| **Feature Overview** | Panel locale and timezone preferences affecting labels, CMS, tutorials, notifications. |
| **Functionalities** | Login language toggle; in-panel language change; set default timezone; device token save (FCM). |
| **User Roles & Permissions** | Authenticated. |
| **Business Rules** | Locale persisted; Greek labels for bilingual masters. |
| **Validation Rules** | Supported locales only. |
| **UI Components/Screens** | Language toggles; timezone setter. |
| **Actions Available** | Change language, Set timezone, Save device token. |
| **Filters & Search** | N/A |
| **Status Flow** | N/A |
| **Notifications & Alerts** | N/A |
| **API Integration** | Laravel `language.change`, `shipper.language.change`, `shipper.set-default-timezone`, `shipper.save-device.token`. React: `react-i18next` locales present; backend sync TBD. |
| **Dependencies** | All localized modules. |
| **Edge Cases** | Missing translation keys fallback. |
| **Implementation Status** | Laravel ✅ · React 🚧 |
| **Remarks/Notes** | — |

---

## 4. React sidebar inventory vs Laravel

| React nav item | Route / href | Laravel equivalent | Status |
| --- | --- | --- | --- |
| Dashboard | `/dashboard` | Dashboard | 🚧 |
| Create Shipment | `/shipments/create` | Create Shipment | 🚧 |
| Manage Shipments | `/shipments` | Manage Shipment | 🚧 |
| Truck Availability | `/search-trucks` | Search Available Trucks | ✅ |
| Address Book | `/address-book` | Address Book | ✅ |
| Product Master | `/products` | Product Master | ✅ |
| Partners | `/partners` | Partners | ✅ |
| ERP Orders | `/erp-orders` | — (new) | ✅ |
| Subscription | `#subscription` | Subscription | ❌ |
| Billing | `#billing` | Billing | ❌ |
| Support | `#support` | Support & Feedback | ❌ |
| Tutorial | `#tutorial` | Tutorials | ❌ |
| (User menu) Profile / Users / Notifications / Chat / Refer / Change Password | — | Present in Laravel | ❌ |

---

## 5. Suggested React migration phases

| Phase | Focus | Modules |
| --- | --- | --- |
| **A — Core freight (in progress / largely done)** | Day-to-day ops | Address Book, Product Master, Partners, Create Shipment, SAT, ERP Orders, Manage/Detail (complete gaps) |
| **B — Account & access** | Hard gates | Login complete (forgot password), Signup/KYC, Past-due gate, Profile + Profile Information, Change Password, User Management |
| **C — Monetization** | Revenue continuity | Subscription, Billing, Load limits, Global Upgrade modal, Account Statement (if required) |
| **D — Collaboration & engagement** | Retention | Notifications, Chat, Refer, Support/Feedback, Tutorials, Onboarding Tour |
| **E — Polish** | Parity closeout | Dashboard live data, Edit Shipment, CMS legal pages, Public Track strategy, Language/timezone sync |

---

## 6. Related documents

| Document | Path |
| --- | --- |
| Miro module specs | `MV_Backend_API/miro/Shipper/*/MYVAGON-Shipper-*.md` |
| Miro test tables | `MV_Backend_API/miro/Shipper/*/Table-view.md` |
| Address Book parity | `shipper/docs/ADDRESS_BOOK_PARITY.md` |
| Product Master parity | `shipper/docs/PRODUCT_MASTER_PARITY.md` |
| Partners parity | `shipper/docs/PARTNERS_PARITY.md` |
| ERP Orders parity | `shipper/docs/ERP_ORDERS_PARITY.md` |
| Search Trucks map parity | `shipper/docs/SEARCH_TRUCKS_MAP_PARITY.md` |
| Create Shipment QA | `shipper/docs/PDS-917-Steps-1-2-QA.md`, `PDS-917-Step-3-QA.md` |
| Laravel web routes | `MV_Backend_API/routes/shipper.php` |
| React API routes | `MV_Backend_API/routes/api/shipper.php` |
| React router | `shipper/src/router.tsx` |

---

## 7. Change log

| Date | Author | Change |
| --- | --- | --- |
| 2026-07-20 | Auto (migration analysis) | Initial comprehensive Feature Mapping & Functional Specification from Laravel Miro + routes vs React `shipper/` app |

---

*Update Implementation Status cells as React work ships. Prefer linking PR/PDS tickets in Remarks.*
