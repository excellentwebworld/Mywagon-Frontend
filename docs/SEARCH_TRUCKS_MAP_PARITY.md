# Search Trucks — Map List Parity (PDS-933 Spec v2)

## Implemented

- [x] Airbnb-style SearchPill (collapsed + expanded): Pickup City, Pickup Date, Vehicle Type, optional Dropoff
- [x] QuickFilterBar: visibility dropdown, Available Today, Starting &lt;8h, Premium Has Bids, Premium Load Match
- [x] KPI strip removed
- [x] 60/40 split: AvailabilityCard list + Google Map
- [x] Price / Offer OverlayView pins; private styling; hover/select sync
- [x] Dest pin + **road** polyline via Google Directions (straight-line fallback if Directions fails); Pickup / Dropoff endpoint labels on selected route
- [x] List-side detail overlay (not covering map)
- [x] Map expand / collapse; mobile map overlay
- [x] Booking drawer preserved
- [x] EN/EL i18n keys
- [x] **Phase C:** Live availabilities API (`/api/shipper/v1/availabilities`) via TanStack Query
- [x] **Phase C:** Pending matches + place bid (`POST .../bids`); create-new → Create Shipment with sessionStorage prefill
- [x] **Phase C:** Hide non-selected map pins (not dim)
- [x] **Phase C:** Starting &lt;8h via server `starting_within_hours=8`
- [x] **Phase C:** API vehicle types checkboxes in SearchPill (`useVehicleTypes` → `truck_type_ids[]`)
- [x] **Phase C:** Blurred/offer price + bids count from API permissions
- [x] Mock fallback: `VITE_USE_SEARCH_TRUCKS_MOCK=true`
- [x] **Phase D:** Module entitlement gate — BE `upgrade_url` on availabilities 403; modal + banner Upgrade Now CTA
- [x] **Phase D:** Skeleton list/map loading; empty vs error+Retry; blocked state distinct from “no results”
- [x] **Phase D:** Client CSV export hardened (blocked / loading / empty guards; current page/result set only)
- [x] **UX:** Card-shaped list skeletons + append loading while infinite-scrolling
- [x] **UX:** Infinite scroll list (`useInfiniteQuery`, page size 12); page-number pagination removed
- [x] **UX:** Map pins from separate all-pages query (`per_page=100`, hard cap 500); not limited to current list window
- [x] **Phase E:** Map-bounds search — `pickup_ne/sw_lat/lng` API + “Search this area” CTA (bounds override pill radius)
- [x] **Phase F:** Cargo category filter — `truck_category_ids[]` + VehicleSelector-depth tree in SearchPill
- [x] **Phase G:** Create Shipment `availability_id` on draft `wizard_state`; publish creates Blade-parity availability bid
- [x] **UX:** Sticky “Creating from availability” bar on Create Shipment steps 1–3; loads details via `GET /availabilities/{id}` (id in `wizard_state`)
- [x] **UX:** “Create new shipment” from SAT skips booking drawer → Create Shipment with `availability_id` directly; drawer kept for pending-bid only
- [x] **Phase H:** Server CSV export `GET /availabilities/export` (cap 5000); live FE uses blob download; mock keeps client CSV
- [x] **Prefill polish:** Proceed `truck_type_id`; Step 1 AddressBook `locationId` from lat/lng; Step 2 `vehicleSpecs` seed

## Map key

Uses `VITE_GOOGLE_MAPS_KEY` via `loadGoogleMaps`. Without key, placeholder with clickable fake pins.

## Export note

- **Live:** CSV from `GET /api/shipper/v1/availabilities/export` with current filters (no pagination; max 5000 rows).
- **Mock:** Client CSV of the full filtered in-memory result set.

## List & map data

- **List:** Infinite scroll; toolbar shows `meta.total`. Scroll sentinel loads next page of 12.
- **Map:** Separate filter query walks pages at 100 until done or 500 pins; optional `satMapPinCap` when truncated.
- **Mock:** List appends slices of 12; map shows the full filtered mock set.

## Manual smoke checklist

1. User **without** `search_available_trucks` → subscription modal + banner; **Upgrade Now** opens shipper subscription plan.
2. Entitled user → list/map load; empty state if no trucks (not the upgrade empty copy).
3. First paint shows card-shaped list skeletons; map shimmer until map query resolves (not on list append).
4. Scroll list past page 1 without page buttons; total count stays correct; map pin count can exceed loaded list rows.
5. Select pin → other pins hide; destination shows when lane has dest.
6. Chip Starting &lt;8h / Has Bids (premium toast + chip clear if denied).
7. Book pending → bid created; appears on Manage Shipment.
8. Create new → wizard opens with prefill; after publish, availability invitation bid exists.
9. Pan map → **Search this area** refreshes results for viewport; pill Search clears bounds mode.
10. Select cargo category under a truck type → list filters via categories.
11. Export CSV downloads full filtered set (live) or full filtered mock set.

## Follow-ups (optional)

_(none — SAT → Create Shipment locationId + vehicleSpecs prefill complete)_

## PDS-939 Flow 1 — Bid with existing shipment (2 steps)

- Split Book/Bid wizard: left truck details stay visible; right panel has 2 steps
- Step 1: Manage-Shipments-style pending table + Match Score after Choose (Cancel / Continue)
- Step 2: load snapshot + editable offer → Send bid
- Public/private pending filter by truck visibility; match score premium-gated
- `GET /availabilities/{id}/pending-matches/{shipmentId}` for score + snapshot
- Place bid accepts custom `quote` for all availability bids (PDS-943)

## Prefill notes

- Proceed `prefill` includes `truck_type_id` (int) plus display `truck_type`.
- Create Shipment Step 1 resolves AddressBook `locationId` via nearest match (≤150 m) to proceed lat/lng.
- Step 2 `vehicleSpecs` seeded from `truck_type_id` (all category items for that type) when the vehicle catalog is ready.