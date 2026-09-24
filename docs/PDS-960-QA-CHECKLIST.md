# PDS-960 — Notifications Center + Push/Email QA Checklist

Shipper React panel + Laravel API (+ Node socket for chat FCM). Blade panel remains the functional reference for preferences and outbound sends.

Companion matrix (every notification class): [PDS-960-NOTIFICATIONS-QA-MATRIX.md](./PDS-960-NOTIFICATIONS-QA-MATRIX.md)

## Preconditions

- React `.env` has `VITE_FIREBASE_*` + `VITE_FIREBASE_VAPID_KEY`
- Browser notification permission **Allowed**
- Queue worker running (`php artisan queue:work`)
- Mailtrap/SMTP configured
- Socket server (`C:\xampp\htdocs\Node-Project\MV_socket-NodeJS`) deployed with `NotificationPreferenceHelper` (chat `push_messages` gate)
- Test shipper has `device_token` set after login

---

## A. Settings (Blade parity)

| # | Step | Expected |
|---|---|---|
| A1 | Settings → Notifications | Push + Email sections load from `GET /settings/notifications` |
| A2 | Push: New Availability, Booking Bidding, Shipment Progress, Cancellation, Messages | Five push toggles |
| A3 | Email: same four categories + Weekly Activity Report | No Messages under Email |
| A4 | Push All / Email All master toggles | Toggle all in section |
| A5 | Save → reload | Values persist (`PUT /settings/notifications`) |
| A6 | Sub-user opens settings | Sees **owner** preferences |

---

## B. Listing / bell / FCM client

| # | Step | Expected |
|---|---|---|
| B1 | Header bell | Unread badge + recent list |
| B2 | Open `/settings/notifications` | Filters: All / Unread / Today / categories / Archived |
| B3 | Mark one / mark all read | Unread count updates |
| B4 | Archive / unarchive | Moves to Archived segment |
| B5 | Click shipment / bid / availability / partner / invoice row | Correct React route |
| B6 | Foreground FCM | Toast + `shipper:notification-received` refreshes badge |
| B7 | Background FCM click | SW focuses app; navigates (products → `/products`) |
| B8 | Logout | Server `device_token` cleared; no further pushes to this browser |

---

## C. Preference-gated delivery

| # | Category | Trigger (example) | Push on | Email on | Push off | Email off |
|---|---|---|---|---|---|---|
| C1 | New Availability | Carrier posts matching truck | FCM + DB | Mail | No FCM; DB yes | No mail |
| C2 | Booking Bidding | Carrier bids on load | FCM + DB | Mail | No FCM; DB yes | No mail |
| C3 | Shipment Progress | Driver starts trip / POD | FCM + DB | Mail | No FCM; DB yes | No mail |
| C4 | Cancellation | Carrier cancels | FCM + DB | Mail | No FCM; DB yes | No mail |
| C5 | Messages | Carrier chats (socket) | FCM | N/A | No FCM; socket UI OK | — |
| C6 | Weekly report | `SendShipperWeeklyActivityReportJob` | N/A | Mail | — | No mail |

---

## D. Always-on

| # | Type | Expected |
|---|---|---|
| D1 | Partner request / accept | Push + email + in-app → `/partners` |
| D2 | KYC accept/reject | → `/settings/compliance` |
| D3 | Invoice / paid | → `/billing` |
| D4 | Admin bulk | Topic push + DB row; deep link from redirect_slug |
| D5 | T&C / privacy update | → `/settings/terms` |

---

## E. Automated regression

| # | Command | Expected |
|---|---|---|
| E1 | `npm test -- --run src/utils/notificationNavigation.test.ts src/components/notifications/RealtimeNotificationToast.test.ts` | Pass |
| E2 | `php vendor/bin/phpunit tests/Unit/Listeners/FilterShipperNotificationBySettingsTest.php` | Pass |

---

## Sign-off

| Role | Date | Result | Notes |
|---|---|---|---|
| Dev | | Pass / Fail | Code fixes + unit tests |
| QA | | Pass / Fail | Staging matrix Section E |
