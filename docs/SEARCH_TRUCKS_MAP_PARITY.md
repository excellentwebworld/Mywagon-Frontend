# Search Trucks — Map List Parity (PDS-933 Spec v2)

## Implemented

- [x] Airbnb-style SearchPill (collapsed + expanded): Pickup City, Pickup Date, Vehicle Type, optional Dropoff
- [x] QuickFilterBar: visibility dropdown, Available Today, Starting &lt;8h, Premium Has Bids, Premium Load Match
- [x] KPI strip removed
- [x] 60/40 split: AvailabilityCard list + Google Map
- [x] Price / Offer OverlayView pins; private styling; hover/select sync
- [x] Dest pin + polyline when selected lane has destination
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
- [x] **Phase E:** Map-bounds search — `pickup_ne/sw_lat/lng` API + “Search this area” CTA (bounds override pill radius)
- [x] **Phase F:** Cargo category filter — `truck_category_ids[]` + VehicleSelector-depth tree in SearchPill
- [x] **Phase G:** Create Shipment `availability_id` on draft `wizard_state`; publish creates Blade-parity availability bid
- [x] **Phase H:** Server CSV export `GET /availabilities/export` (cap 5000); live FE uses blob download; mock keeps client CSV
- [x] **Prefill polish:** Proceed `truck_type_id`; Step 1 AddressBook `locationId` from lat/lng; Step 2 `vehicleSpecs` seed

## Map key

Uses `VITE_GOOGLE_MAPS_KEY` via `loadGoogleMaps`. Without key, placeholder with clickable fake pins.

## Export note

- **Live:** CSV from `GET /api/shipper/v1/availabilities/export` with current filters (no pagination; max 5000 rows).
- **Mock:** Client CSV of the current in-memory result set.

## Manual smoke checklist

1. User **without** `search_available_trucks` → subscription modal + banner; **Upgrade Now** opens shipper subscription plan.
2. Entitled user → list/map load; empty state if no trucks (not the upgrade empty copy).
3. Select pin → other pins hide; destination shows when lane has dest.
4. Chip Starting &lt;8h / Has Bids (premium toast + chip clear if denied).
5. Book pending → bid created; appears on Manage Shipment.
6. Create new → wizard opens with prefill; after publish, availability invitation bid exists.
7. Pan map → **Search this area** refreshes results for viewport; pill Search clears bounds mode.
8. Select cargo category under a truck type → list filters via categories.
9. Export CSV downloads full filtered set (live) or current mock page.

## Follow-ups (optional)

_(none — SAT → Create Shipment locationId + vehicleSpecs prefill complete)_

## Prefill notes

- Proceed `prefill` includes `truck_type_id` (int) plus display `truck_type`.
- Create Shipment Step 1 resolves AddressBook `locationId` via nearest match (≤150 m) to proceed lat/lng.
- Step 2 `vehicleSpecs` seeded from `truck_type_id` (all category items for that type) when the vehicle catalog is ready.