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

## Map key

Uses `VITE_GOOGLE_MAPS_KEY` via `loadGoogleMaps`. Without key, placeholder with clickable fake pins.

## Follow-ups (API)

- Replace `MOCK_TRUCKS` with availability search API
- Real radius / map-bounds filtering
- Full VehicleSelector depth picker in pill (currently compact select)
