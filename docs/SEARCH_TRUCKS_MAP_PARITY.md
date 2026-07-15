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

## Map key

Uses `VITE_GOOGLE_MAPS_KEY` via `loadGoogleMaps`. Without key, placeholder with clickable fake pins.

## Follow-ups

- Real map-bounds “search as I move the map”
- Full Formik VehicleSelector cargo-spec tree in pill (needs BE cargo filters)
- Create Shipment publish with `availability_id` end-to-end (prefill only today)
- Phase D: page-entry subscription gate, E2E smoke
