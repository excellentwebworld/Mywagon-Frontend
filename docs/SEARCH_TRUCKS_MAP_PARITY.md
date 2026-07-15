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

## Map key

Uses `VITE_GOOGLE_MAPS_KEY` via `loadGoogleMaps`. Without key, placeholder with clickable fake pins.

## Export note

CSV export downloads the **current result set returned by the API** (current page / filters), not a full unpaged export. There is no server CSV endpoint.

## Manual smoke checklist

1. User **without** `search_available_trucks` → subscription modal + banner; **Upgrade Now** opens shipper subscription plan.
2. Entitled user → list/map load; empty state if no trucks (not the upgrade empty copy).
3. Select pin → other pins hide; destination shows when lane has dest.
4. Chip Starting &lt;8h / Has Bids (premium toast + chip clear if denied).
5. Book pending → bid created; appears on Manage Shipment.
6. Create new → wizard opens with availability prefill (`sat_availability_prefill`).
7. Export CSV downloads for current results; blocked/empty show toast (no download).

## Follow-ups

- Real map-bounds “search as I move the map”
- Full Formik VehicleSelector cargo-spec tree in pill (needs BE cargo filters)
- Create Shipment publish with `availability_id` end-to-end (prefill only today)

## Jira PDS-933 — Spec v2 acceptance (paste if MCP unavailable)

**Spec v2 supersedes** description Spec v1 table/KPI layout.

Acceptance (product-complete Search Available Trucks React):

- [ ] Search list + map sync (select pin hides others; dest polyline when applicable)
- [ ] Bid/book pending path works; create-new opens Create Shipment with prefill
- [ ] Subscription gate: denied module shows modal + Upgrade Now → subscription plan (`upgrade_url` / Laravel fallback)
- [ ] Empty results distinct from load error (Retry) and subscription blocked
- [ ] Export CSV of current results with empty/blocked guards
- [ ] Manual smoke checklist above signed off
