# PDS-960 — Shipper Notifications Push & Email QA Matrix

Status legend: **Functional** | **Partially** | **Needs fixing** | **N/A**

Re-test: **Code-verified** = unit/static parity after fix; **Staging** = live FCM/SMTP still recommended.

Shared send stack (Blade + React): Laravel `app/Notifications/Shipper/*` → `FilterShipperNotificationBySettings` → FCM + mail + database. React consumes via `/api/shipper/v1/notifications*` + FCM web push.

---

## A. Preference-gated notification classes

| # | Notification class | Category | Push slug | Email slug | Push | Email | In-app | Deep link (React) | Root cause / fix | Re-test |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | `CarrierPostedAvailabilityShipperNotification` | New Availability | `push_new_availability` | `email_new_availability` | Functional | Functional | Functional | `/search-trucks` | — | Code-verified |
| A2 | `MatchesWithTrucksForAPostedShipmentShipperNotification` | New Availability | same | same | Functional | Functional | Functional | `/shipments/{id}` (`viewLoad`) | — | Code-verified |
| A3 | `AvailibilityCreate12HoursNotification` | New Availability | same | same | Functional | Functional | Functional | `/search-trucks` | — | Code-verified |
| A4 | `AvailibilityCreationByCarrierNotification` | New Availability | same | same | Functional | Functional | Functional | `/search-trucks` | — | Code-verified |
| A5 | `AvailibilityDeletionByCarrierNotification` | New Availability | same | same | Functional | Functional | Functional | `/search-trucks` | — | Code-verified |
| A6 | `AvailibilityExpiredNotification` | New Availability | same | same | Functional | Functional | Functional | `/search-trucks` | — | Code-verified |
| B1 | `BidReceivedShipperNotification` | Booking Bidding | `push_booking_bidding` | `email_booking_bidding` | Functional | Functional | Functional | `/shipments/{id}?focus=bids` | — | Code-verified |
| B2 | `BidAcceptedShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B3 | `BidRejectedShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B4 | `BidAcceptedOnShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B5 | `BidReceivedOnAvailibilityNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B6 | `NewBidReceivedNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B7 | `CounterOfferFromShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| B8 | `CounterOfferReceivedByShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | Was missing from API `CATEGORY_MAP`/`ACTION_MAP` → added | Code-verified |
| B9 | `CounterOfferAcceptedByCarrierNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | Same map fix | Code-verified |
| B10 | `CounterOfferRejectedByCarrierNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | Same map fix | Code-verified |
| B11 | `PrivateInterestReceivedNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | Same map fix | Code-verified |
| B12 | `CounterOfferOnPrivateInterestNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | Same map fix | Code-verified |
| B13 | `CarrierBookedLoadShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | `/shipments/{id}` | ACTION_MAP `viewLoad` added | Code-verified |
| B14 | `CarrierAcceptedRequestForShipmentShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | `/shipments/{id}` | Same | Code-verified |
| B15 | `CarrierRejectedRequestForShipmentShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | `/shipments/{id}` | Same | Code-verified |
| B16 | `PendingShipmentTimeApproachingShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | `/shipments/{id}` | Same | Code-verified |
| B17 | `PickupTimeIsApproachingAndNoCarrierHasBeenMatchedShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | `/shipments/{id}` | Same | Code-verified |
| B18 | `PickupTimeIsApproachingAndUserHasNotRespondedToBidsShipperNotification` | Booking Bidding | same | same | Functional | Functional | Functional | bids focus | — | Code-verified |
| P1 | `DriverStartedTripShipperNotification` | Shipment Progress | `push_shipment_progress` | `email_shipment_progress` | Functional | Functional | Functional | `/shipments/{id}` | Category→`viewLoad` fallback | Code-verified |
| P2 | `DriverLoadingShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P3 | `DriverUnloadingShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P4 | `DriverEnRouteToDestinationShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P5 | `DriverArrivedAtLocationShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P6 | `DriverCompletedPickupShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P7 | `DriverCompletedDropoffShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P8 | `DriverCompletedShipmentShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P9 | `ShipmentActionShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P10 | `ShipmentCoOwnerShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P11 | `AssignedCoOwnerForAShipmentShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P12 | `ItineraryModificationAcceptedShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P13 | `RateCarrierShipperNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P14 | `ShipmentCreate12HoursNotification` | Shipment Progress | same | same | Functional | Functional | Functional | load | — | Code-verified |
| P15 | `DriverUploadedPODShipperNotification` | Docs (API) / Progress (prefs) | progress push | progress email | Functional | Functional | Functional | `?focus=docs` | Prefs treat POD as progress; listing category Docs | Code-verified |
| P16 | `DriverWillUploadPODLaterShipperNotification` | Docs / Progress | same | same | Functional | Functional | Functional | docs | Same | Code-verified |
| C1 | `CarrierCanceledShipmentShipperNotification` | Cancellation | `push_cancelletion` | `email_cancelletion` | Functional | Functional | Functional | load | — | Code-verified |
| C2 | `CancelShipmentShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C3 | `CarrierRequestsToCancelShipmentShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C4 | `ShipmentCanceledBecauseNoDriverFoundShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C5 | `ShipmentHasBeenMovedToDraftShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C6 | `CancelledShipmentHasBeenMovedToDraftShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C7 | `CarrierCouldNotPickupShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C8 | `CarrierCouldNotDropoffShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| C9 | `ItineraryModificationRejectedShipperNotification` | Cancellation | same | same | Functional | Functional | Functional | load | — | Code-verified |
| M1 | Live chat FCM (socket `FirebaseHelper`, `type=message`) | Messages | `push_messages` | N/A (socket) | Functional | N/A | N/A (socket, not DB) | `/messages?userId=` | **Was Needs fixing:** socket ignored `push_messages`. Fixed in `Node-Project/MV_socket-NodeJS` (`NotificationPreferenceHelper.ts`) | Code-verified |
| M2 | `MessageReceivedShipperNotification` (Laravel; observer commented) | Messages | `push_messages` | always allowed | Functional | Functional | Functional | `openChat` → `/messages` | Fixed `type` `shipment`→`message`; ACTION `openChat`. Observer stays off (Sequelize path) | Code-verified |
| M3 | `MessageReceived12HoursNotification` | Messages | `push_messages` | always | Functional | Functional | Functional | `openChat` | ACTION map added | Code-verified |
| W1 | `WeeklyActivityReportNotification` | Email-only | N/A | `email_weekly_activity_report` | N/A | Functional | Functional | `/dashboard` | mail-only `via()`; ACTION `viewDashboard` | Code-verified |

### Preference negative tests

| # | Scenario | Expected | Status | Re-test |
|---|---|---|---|---|
| N1 | Disable Booking Bidding push | No FCM; email+DB still if email on | Functional | Code-verified (PHPUnit) |
| N2 | Disable Cancellation email | No mail; FCM+DB still if push on | Functional | Code-verified (PHPUnit) |
| N3 | Disable Messages push | No chat FCM from socket | Functional | Code-verified (socket helper) |
| N4 | Disable Weekly Activity Report email | No weekly mail | Functional | Code-verified (service map) |

**Note:** Database channel is **no longer** gated by push toggles (`FilterShipperNotificationBySettings`) so React/Blade listing still receives in-app rows when web push is off.

---

## B. Always-on / system types (empty preference keys)

| # | Notification class | Push | Email | In-app | Deep link | Status notes | Re-test |
|---|---|---|---|---|---|---|---|
| S1 | `CarrierPartnerRequestShipperNotification` | Functional | Functional | Functional | `/partners` | Always-on | Code-verified |
| S2 | `NewCarrierPartnerAddedSuccessfullyShipperNotification` | Functional | Functional | Functional | `/partners` | | Code-verified |
| S3 | `ShipperPartnerAcceptedNotification` | Functional | Functional | Functional | `/partners` | | Code-verified |
| S4 | `ShipperPartnerRequestNotification` | Functional | Functional | Functional | `/partners` | | Code-verified |
| S5 | `PartnerRequestAcceptedNotification` | Functional | Functional | Functional | `/partners` | | Code-verified |
| S6 | `PartnerRequestRejectedNotification` | Functional | Functional | Functional | `/partners` | | Code-verified |
| S7 | `PrivateShipmentNotification` | Functional | Functional | Functional | partners/load | CATEGORY Partners | Code-verified |
| S8 | `InvoiceHasBeenIssuedByMVAdminShipperNotification` | Functional | Functional | Functional | `/billing` | | Code-verified |
| S9 | `CarrierMarkedLoadAsPaidShipperNotification` | Functional | Functional | Functional | `/billing` | | Code-verified |
| S10 | `PaymentReceiptNotification` | Functional | Functional | Functional | `/billing` | CATEGORY_MAP added | Code-verified |
| S11 | `SubscriptionAssignedNotification` / downgrade/free variants | Functional | Functional | Functional | billing/subscription | CATEGORY_MAP Billing | Code-verified |
| S12 | `KycAcceptedNotification` / `KycRejectedNotification` | Functional | Functional | Functional | `/settings/compliance` | | Code-verified |
| S13 | `TermsAndConditionsOrPrivacyPolicyUpdatesShipperNotification` | Functional | Functional | Functional | `/settings/terms` | ACTION `viewTerms` | Code-verified |
| S14 | `IncentiveProgramCompleteShipperNotification` | Functional | Functional | Functional | notifications | System | Code-verified |
| S15 | `ReferredProgramCompleteShipperNotification` / `ReferringProgramCompleteShipperNotification` | Functional | Functional | Functional | notifications | System | Code-verified |
| S16 | `BulkFromAdminNotification` + FCM topic | Functional | N/A (DB+topic) | Functional | redirect_slug / external | Topic `shipper_announcement(_staging)` | Code-verified |
| S17 | `ShipmentInviteRemindNotification` | Functional | Functional | Functional | System | | Code-verified |

---

## C. Miro UI / settings cases (NS-001…NS-036) — React panel

| ID | Scenario | Status | Notes |
|---|---|---|---|
| NS-001 | Open Notifications | Functional | `/settings/notifications` |
| NS-002 | No notifications entitlement | Partially | Confirm upgrade modal parity vs Blade on staging |
| NS-003 | Header bell dropdown | Functional | `Header.tsx` |
| NS-004 | View all | Functional | |
| NS-005 | Empty dropdown | Functional | |
| NS-006 | Listing columns | Functional | Card list (not Blade table) — parity of fields |
| NS-007–012 | Deep links (shipment, chat, partners, trucks, invoice) | Functional | After ACTION_MAP + nav fixes |
| NS-013 | Pagination | Functional | |
| NS-014–020 | Settings toggles + Messages push-only + Weekly email | Functional | `NotificationsSection.jsx` |
| NS-021–022 | External URL / Terms | Functional | |
| NS-023–025 | Sidebar badges | Partially | Badge APIs exist; React sidebar badge realtime — verify on staging |
| NS-026 | Tutorial | Functional | tutorial module slug `notifications` |
| NS-027–028 | Localized title / redirect_slug | Functional | API presenter |
| NS-029–030 | Preference integration | Functional | Listener + socket push_messages |
| NS-031 | Dashboard view all | Functional | |
| NS-032 | Partner accept link | Functional | |
| NS-033 | Timestamp | Functional | |
| NS-034 | Push All master toggle | Functional | |
| NS-035 | Settings without listing sub | Functional | Settings ungated |
| NS-036 | Upgrade from dropdown | Partially | Same as NS-002 — staging |

---

## D. Fixes applied this ticket

1. **Chat `push_messages` ignored** → `Node-Project/MV_socket-NodeJS` `NotificationPreferenceHelper` + gate in `ChatController.sendMessage`
2. **Product FCM deep link** `/product-master` → `/products` (SW + toast)
3. **Negotiation / billing classes** missing from API maps → `NotificationsController` CATEGORY/ACTION maps extended
4. **Message notification type** `shipment` → `message`; `openChat` action end-to-end
5. **In-app DB gated by push** → listener only gates FCM/`firebase` + mail
6. **Logout FCM** → clear device token before logout API; `unregisterFcmDevice` also POSTs null
7. **Unit tests** — Vitest nav/toast; PHPUnit filter listener

---

## E. Staging smoke (manual)

- [ ] Enable all prefs; trigger one event per category; confirm Push + Email + In-app
- [ ] Disable each push category; confirm FCM suppressed, in-app still appears
- [ ] Disable each email category; confirm mail suppressed
- [ ] Disable Messages push; carrier sends chat; no FCM (socket still delivers)
- [ ] Admin bulk topic push while React backgrounded
- [ ] Weekly report job with toggle on/off
