# PDS 960 — Shipper Notifications Center: Complete Phase-Wise Technical Documentation

---

## Table of Contents
1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [Phase 1: Database Architecture & Migration](#2-phase-1-database-architecture--migration)
3. [Phase 2: Backend API Endpoints & Business Logic](#3-phase-2-backend-api-endpoints--business-logic)
4. [Phase 3: Admin Broadcasts & Topic Subscriptions](#4-phase-3-admin-broadcasts--topic-subscriptions)
5. [Phase 4: Frontend React Architecture & UI Layout](#5-phase-4-frontend-react-architecture--ui-layout)
6. [Phase 5: Firebase Cloud Messaging (FCM) & Web Push](#6-phase-5-firebase-cloud-messaging-fcm--web-push)
7. [Phase 6: Verification, Testing & Troubleshooting](#7-phase-6-verification-testing--troubleshooting)

---

## 1. Executive Summary & System Architecture

**PDS 960** implements a production-grade, end-to-end Notification Center across the Laravel Backend API (`MV_Backend_API`) and the React Shipper Web Panel (`shipper_react`).

### High-Level Architecture Diagram
```
┌──────────────────────────────────────────────────────────────────────────┐
│                             ADMIN PANEL                                  │
│  - Broadcast Push Notifications (BulkFromAdminNotification)              │
│  - Sends via FCM Topic (shipper_announcement) & Database Queue           │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         LARAVEL BACKEND API                              │
│  - NotificationsController (Index, UnreadCount, MarkRead, Archive)       │
│  - ProfileController (Idempotent Device Token & Topic Subscription)      │
│  - Notification Models & Category/Severity Auto-Mapping Engine           │
│  - Dynamic Placeholder Interpolation (:shipment_id -> SID-10263)         │
└───────────────────┬───────────────────────────────────┬──────────────────┘
                    │ REST API                          │ FCM Web Push
                    ▼                                   ▼
┌───────────────────────────────────────┐ ┌────────────────────────────────┐
│             REACT FRONTEND            │ │     SERVICE WORKER (SW)        │
│  - NotificationsPage.tsx (Triage UI)  │ │  - firebase-messaging-sw.js    │
│  - NotificationsSection.jsx (Settings)│ │  - Background Push Reception   │
│  - notificationService.ts (API Layer) │ │  - Auto Focus / Tab Navigation │
│  - useFcm.ts (Foreground Push/Toast)  │ └────────────────────────────────┘
│  - Header.tsx (Live Unread Badge Dot) │
└───────────────────────────────────────┘
```

---

## 2. Phase 1: Database Architecture & Migration

### 2.1 Database Schema
The database notification infrastructure leverages Laravel's morphable `notifications` table:

```sql
CREATE TABLE `notifications` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notifiable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `notifiable_id` bigint(20) UNSIGNED NOT NULL,
  `data` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.2 Migration: `archived_at`
- **File**: `database/migrations/2026_08_26_000001_add_archived_at_to_notifications_table.php`
- **Purpose**: Enables soft-archival of notifications without deleting records.
- **Rollback**: Fully supports `down()` with `dropColumn('archived_at')`.

### 2.3 Morph Type Resolution
Historical records in the database use `notifiable_type = 'shipper'` while standard Eloquent models use `notifiable_type = 'App\Models\Shipper'`. The query scope unifies both:
```php
$query->where(function ($q) use ($shipper) {
    $q->where('notifiable_type', 'shipper')
      ->orWhere('notifiable_type', get_class($shipper))
      ->orWhere('notifiable_type', 'App\\Models\\Shipper');
})->where(function ($q) use ($shipper) {
    $q->where('notifiable_id', $shipper->id);
    if (!empty($shipper->parent_shipper_id)) {
        $q->orWhere('notifiable_id', $shipper->parent_shipper_id);
    }
});
```

---

## 3. Phase 2: Backend API Endpoints & Business Logic

### 3.1 Endpoint Specifications

| Method | URI | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/shipper/v1/notifications` | Paginated notification list with segmentation filter | Sanctum Bearer |
| `GET` | `/api/shipper/v1/notifications/unread-count` | Returns total integer count of unread alerts | Sanctum Bearer |
| `POST` | `/api/shipper/v1/notifications/mark-all-read` | Marks all active unread alerts as read | Sanctum Bearer |
| `POST` | `/api/shipper/v1/notifications/{id}/read` | Marks single notification as read | Sanctum Bearer |
| `POST` | `/api/shipper/v1/notifications/{id}/archive` | Toggles notification archive status | Sanctum Bearer |
| `POST` | `/api/shipper/v1/auth/device-token` | Registers/clears FCM device token and subscribes to topics | Sanctum Bearer |

### 3.2 Category & Segmentation Matrix

The controller (`NotificationsController.php`) maps notification types to the 4 core business segments:

```php
private const CATEGORY_MAP = [
    // 1. New Availability
    'CarrierPostedAvailabilityShipperNotification'                         => 'New Availability',
    'MatchesWithTrucksForAPostedShipmentShipperNotification'               => 'New Availability',
    'AvailibilityCreate12HoursNotification'                                => 'New Availability',
    'AvailibilityCreationByCarrierNotification'                            => 'New Availability',
    'AvailibilityDeletionByCarrierNotification'                            => 'New Availability',
    'AvailibilityExpiredNotification'                                      => 'New Availability',

    // 2. Booking Bidding
    'BidReceivedShipperNotification'                                       => 'Booking Bidding',
    'BidAcceptedShipperNotification'                                       => 'Booking Bidding',
    'BidRejectedShipperNotification'                                       => 'Booking Bidding',
    'BidAcceptedOnShipperNotification'                                     => 'Booking Bidding',
    'BidReceivedOnAvailibilityNotification'                                => 'Booking Bidding',
    'NewBidReceivedNotification'                                           => 'Booking Bidding',
    'CounterOfferFromShipperNotification'                                  => 'Booking Bidding',
    'PickupTimeIsApproachingAndUserHasNotRespondedToBidsShipperNotification' => 'Booking Bidding',
    'CarrierBookedLoadShipperNotification'                                 => 'Booking Bidding',
    'CarrierAcceptedRequestForShipmentShipperNotification'                 => 'Booking Bidding',
    'CarrierRejectedRequestForShipmentShipperNotification'                 => 'Booking Bidding',
    'PendingShipmentTimeApproachingShipperNotification'                    => 'Booking Bidding',
    'PickupTimeIsApproachingAndNoCarrierHasBeenMatchedShipperNotification' => 'Booking Bidding',

    // 3. Shipment Progress
    'DriverStartedTripShipperNotification'                                 => 'Shipment Progress',
    'DriverEnRouteToDestinationShipperNotification'                        => 'Shipment Progress',
    'DriverLoadingShipperNotification'                                     => 'Shipment Progress',
    'DriverUnloadingShipperNotification'                                   => 'Shipment Progress',
    'DriverCompletedShipmentShipperNotification'                           => 'Shipment Progress',
    'DriverCompletedDropoffShipperNotification'                            => 'Shipment Progress',
    'DriverCompletedPickupShipperNotification'                             => 'Shipment Progress',
    'DriverArrivedAtLocationShipperNotification'                           => 'Shipment Progress',
    'ReadyForPickupNotification'                                           => 'Shipment Progress',
    'StartTripReminderNotification'                                        => 'Shipment Progress',
    'AllocateDriverNowReminderNotification'                                => 'Shipment Progress',
    'ShipmentActionShipperNotification'                                    => 'Shipment Progress',
    'ShipmentCoOwnerShipperNotification'                                   => 'Shipment Progress',
    'AssignedCoOwnerForAShipmentShipperNotification'                       => 'Shipment Progress',
    'ItineraryModificationAcceptedShipperNotification'                     => 'Shipment Progress',
    'RateCarrierShipperNotification'                                       => 'Shipment Progress',

    // 4. Cancellation
    'ShipmentCanceledBecauseNoDriverFoundShipperNotification'              => 'Cancellation',
    'CarrierCanceledShipmentShipperNotification'                           => 'Cancellation',
    'CancelShipmentShipperNotification'                                    => 'Cancellation',
    'ShipmentCanceledNotification'                                         => 'Cancellation',
    'ShipmentCanceledByShipperNotification'                                => 'Cancellation',
    'ShipmentCanceledByShipperUnder30MinutesNotification'                  => 'Cancellation',
    'CarrierRequestsToCancelShipmentShipperNotification'                   => 'Cancellation',
    'ShipmentHasBeenMovedToDraftShipperNotification'                       => 'Cancellation',
    'CancelledShipmentHasBeenMovedToDraftShipperNotification'              => 'Cancellation',
    'CarrierCouldNotPickupShipperNotification'                             => 'Cancellation',
    'CarrierCouldNotDropoffShipperNotification'                            => 'Cancellation',
    'ItineraryModificationRejectedShipperNotification'                     => 'Cancellation',

    // Other System & Auxiliary
    'DriverUploadedPODShipperNotification'                                 => 'Docs',
    'CarrierPartnerRequestShipperNotification'                             => 'Partners',
    'InvoiceHasBeenIssuedByMVAdminShipperNotification'                     => 'Billing',
    'BulkFromAdminNotification'                                            => 'System',
    'KycAcceptedNotification'                                              => 'System',
];
```

### 3.3 Dynamic Message Parameter Interpolation
Database notifications store localized template strings with parameters like `:shipment_id`. The presenter automatically parses and replaces these placeholders:
```php
$rawTitle = $data['title'] ?? 'Notification';
$rawBody  = $data['body']  ?? '';

$title = is_array($meta) ? __($rawTitle, $meta) : __($rawTitle);
$body  = is_array($meta) ? __($rawBody, $meta)  : __($rawBody);
```
Example Output: `"You have pending bids for your upcoming shipment no. 10263."`

---

## 4. Phase 3: Admin Broadcasts & Topic Subscriptions

### 4.1 Admin Push Dispatching
When administrators trigger notifications from the Admin Panel:
1. Dispatches FCM topic message to `shipper_announcement` (Production) or `shipper_announcement_staging` (Staging).
2. Queues and writes `BulkFromAdminNotification` to the `notifications` table for every targeted shipper.

### 4.2 Automated SDK Topic Subscription
When shippers authenticate and register their FCM token in React, `ProfileController::updateDeviceToken` registers the device token and automatically subscribes it to the topic:
```php
if (!empty($newToken)) {
    $topic = config('app.env') === 'production' ? 'shipper_announcement' : 'shipper_announcement_staging';
    \App\Helpers\CommonHelper::subscribeToTopicWithSDK($newToken, $topic);
}
```

---

## 5. Phase 4: Frontend React Architecture & UI Layout

### 5.1 UI Elements (Top to Bottom)
1. **Header**:
   - Title: `Notifications`
   - Subtitle: `Triage, act on, and audit all operational alerts across your shipments`
   - Actions:
     - `Mark all as read` button (with "as")
     - `Settings` button (opens modal containing `<NotificationsSection />`)
2. **Filter Bar**:
   - Segmentation pills:
     - `All`
     - `Unread`
     - `Today`
     - `New Availability`
     - `Booking Bidding`
     - `Shipment Progress`
     - `Cancellation`
   - Live search input on the right (`Search by title, SID, order, invoice…`)
3. **Notification Cards / Rows**:
   - **Color-coded edge**: Left border colored per category (Blue for *New Availability*, Purple for *Booking Bidding*, Green for *Shipment Progress*, Red for *Cancellation*).
   - **Category Icon**: Dedicated icon inside a colored container.
   - **Bold Title**: High-contrast, bolded heading.
   - **Category Label**: Pill badge displaying the exact segmentation name.
   - **Description**: Full formatted message body.
   - **SID Chip**: Associated `SID-XXXXX` identifier.
   - **Timestamp**: Human-readable relative time.
   - **Direct Redirection**: Primary action button ("View Load", "View Bids", "View Docs") navigates directly to `/shipments/:id`.
4. **Slide-Out Detail Drawer**:
   - Full message view, related objects, timeline, and 1-click action triggers.
5. **Notification Settings Modal**:
   - Embeds `<NotificationsSection />` for full parity with the account settings page.

---

## 6. Phase 5: Firebase Cloud Messaging (FCM) & Web Push

### 6.1 Environment Variables
Configured across `.env`, `.env.development`, `.env.staging`, and `.env.production`:

```env
# Firebase Cloud Messaging
VITE_FIREBASE_API_KEY=AIzaSyBY-2LBJ4O2MvbibFCxoucsBWcPedYG_FE
VITE_FIREBASE_AUTH_DOMAIN=myvagon-67ba6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=myvagon-67ba6
VITE_FIREBASE_STORAGE_BUCKET=myvagon-67ba6.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=33096830005
VITE_FIREBASE_APP_ID=1:33096830005:web:8f7730cf2f3648a337b57c
VITE_FIREBASE_MEASUREMENT_ID=G-RPSTVP3EZR
```

### 6.2 Service Worker (`firebase-messaging-sw.js`)
- Located in `public/firebase-messaging-sw.js` for root scope access.
- Receives background push payloads when the browser tab is closed/inactive.
- Handles `notificationclick` to focus existing browser tabs or open new windows targeting `/notifications`.

---

## 7. Phase 6: Verification, Testing & Troubleshooting

### 7.1 Automated Testing & Verification
1. **PHP Syntax Check**:
   ```bash
   php -l app/Http/Controllers/Api/Shipper/V1/Notifications/NotificationsController.php
   php -l app/Http/Controllers/Api/Shipper/V1/Auth/ProfileController.php
   ```
   *Result: 0 syntax errors.*

2. **Frontend Production Build**:
   ```bash
   cmd /c "npm run build"
   ```
   *Result: Passed cleanly (`tsc -b && vite build` built in 4.09s with 0 errors).*
