# Phase-Wise Development Plan: Load Details (Backend & Frontend)

This document outlines the end-to-end architecture, implementation details, and verification status for the complete **Load Details** subsystem across all 9 shipment statuses for both **MV_Backend_API (Laravel)** and **shipper_react (React SPA)**.

---

## 1. Status Matrix & Implementation Status

| Phase | Status Name | Backend Data & Action Endpoints | Frontend Components & Actions | Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Draft** (`draft`) | `GET /api/v1/shipments/{id}` (with `$includeDraft = true`), `ShipmentDetailResource` payload normalization (`load_summary`, `trip_summary`, `audit_entries`). | Command Header, Step Resumption (`/create-shipment?draftId=...`), Stops, Load Summary, Notes, Route Map, Audit Log. | ✅ **COMPLETED** |
| **Phase 2** | **Pending** (`pending`) | `POST /offers/{id}/accept`, `POST /offers/{id}/reject`, `POST /offers/{id}/counter`, `GET /offers/{id}/negotiation-history`, `POST /invites`, `DELETE /invites/{id}`. | `BidsCard.tsx` (Invited Partners vs Public Bids table, sort bids to top), inline Counter drawer, inline `NegotiationHistoryPanel`, Transporter profile links. | ✅ **COMPLETED** |
| **Phase 3** | **Scheduled & Ready** (`scheduled`, `ready`, `past_due`) | `ShipmentCarrierPresenter.php` & `AssignedDriverPresenter.php` (`phone`, `email`, `vehicle_plates`). | `CarrierDriverCard.tsx` with generic Transporter header, Company Carrier with nested Driver layout, Freelancer layout, click-to-copy phone buttons without browser dialing. | ✅ **COMPLETED** |
| **Phase 4** | **On Trip** (`on_trip`, `in_progress`) | `GET /pickup-delay/pending`, `POST /locations/{id}/pickup-delay`, tracking coordinate streaming. | `TrackingMapCard.tsx` (Route map without bottom itinerary, On Time / Delayed status pulse badge), `ShareTrackingModal.tsx` (multiple emails per stop, pickup gating `isPickedUp = true`). | ✅ **COMPLETED** |
| **Phase 5** | **Fulfilled** (`fullfilled`, `delivered`) | `POST /rating` (`RatingController.php`), `shipper_rating` mapping in `ShipmentDetailResource.php`. | `StopsCard.tsx` (White Pickup, Black Dropoff, inline POD view / push request), `RateTripCard.tsx` (1–5 stars, on-time toggle, confirmed summary). | ✅ **COMPLETED** |
| **Phase 6** | **Cancelled & Unfulfilled** (`canceled`, `not_fullfilled`, `partially_fullfilled`) | `GET /cancel-reasons`, `POST /cancel` (`CancelController.php`), cancellation penalty calculations. | `StatusBanner.tsx` (Red cancelled banner, Amber unfulfilled banner, Past due warning), `CancelShipmentModal.tsx` connected to `CommandHeader`, read-only audit mode. | ✅ **COMPLETED** |
| **Phase 7** | **Verification & Polish** | End-to-end API test suites and validation across all statuses. | Comprehensive vitest test suite (`detailViewModel.test.ts`), 100% TypeScript typecheck (`0 errors`). | ✅ **COMPLETED** |

---

## 2. Technical Architecture & File Reference

### Backend (`MV_Backend_API`):
- [`ShipmentController.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Controllers/Api/Shipper/V1/Shipments/ShipmentController.php): Main show controller supporting drafts and full load detail fetching.
- [`ShipmentDetailResource.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Resources/Api/Shipper/Shipments/ShipmentDetailResource.php): Structured resource formatting `load_summary`, `trip_summary`, `audit_entries`, `shipper_rating`, cancellation reasons.
- [`OfferController.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Controllers/Api/Shipper/V1/Shipments/OfferController.php): Accept, Reject, Counter, and Negotiation History endpoints.
- [`InviteController.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Controllers/Api/Shipper/V1/Shipments/InviteController.php): Private partner invitation and invite cancellation endpoints.
- [`RatingController.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Controllers/Api/Shipper/V1/Shipments/RatingController.php): 1–5 star driver/carrier rating and pickup delay reporting endpoints.
- [`CancelController.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Http/Controllers/Api/Shipper/V1/Shipments/CancelController.php): Cancellation reason catalog, penalty calculations, and cancellation execution.
- [`ShipmentCarrierPresenter.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Support/Shipments/ShipmentCarrierPresenter.php): Resolves assigned carrier company / freelancer details with contact info and plates.
- [`AssignedDriverPresenter.php`](file:///c:/xampp/htdocs/MYVAGON/MV_Backend_API/app/Support/Shipments/AssignedDriverPresenter.php): Resolves company driver details with dual plates (truck and trailer).

### Frontend (`shipper_react`):
- [`ShipmentDetail.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/pages/ShipmentDetail/ShipmentDetail.tsx): Root load detail page binding 2-column layout and modal dialogs.
- [`detailViewModel.ts`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/pages/ShipmentDetail/detailViewModel.ts): View model mapper transforming backend payload for all 9 statuses.
- [`detailViewModel.test.ts`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/pages/ShipmentDetail/detailViewModel.test.ts): Master test suite covering all phases and statuses.
- [`CommandHeader.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/CommandHeader.tsx): Header with status badges, wizard edit link, copy ID, language switch, more actions.
- [`StopsCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/StopsCard.tsx): White pickup, black dropoff, collapsible multi-orders/products, inline POD action.
- [`BidsCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/BidsCard.tsx): Invited partners & bids table with inline counter drawer and negotiation history timeline.
- [`CarrierDriverCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/CarrierDriverCard.tsx): Transporter title, carrier company + nested driver, freelancer layout, click-to-copy phone buttons.
- [`TrackingMapCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/TrackingMapCard.tsx): Live tracking pulse indicator, performance summary, clean route map without text itinerary.
- [`ShareTrackingModal.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/ShareTrackingModal.tsx): Multiple emails per stop, copy link gated on pickup (`isPickedUp = true`).
- [`RateTripCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/RateTripCard.tsx): 1–5 star rating with confirmed summary state.
- [`StatusBanner.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/StatusBanner.tsx): Cancelled, unfulfilled, and past-due notification banners.
- [`AuditLogCard.tsx`](file:///c:/xampp/htdocs/MYVAGON/shipper_react/src/components/ShipmentDetail/AuditLogCard.tsx): Full-width bottom section with All, Bidding, and Operations filter tabs.
