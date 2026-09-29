# PDS-960 — Shipper Notifications Push & Email QA Matrix

Status legend: **Functional** | **Partially** | **Needs fixing** | **N/A**

Re-test: **Code-verified** = unit/static parity after fix; **Staging** = live FCM/SMTP still recommended.

Shared send stack (Blade + React): Laravel `app/Notifications/Shipper/*` → `FilterShipperNotificationBySettings` → FCM + mail + database. React consumes via `/api/shipper/v1/notifications*` + FCM web push.

### Cross-cutting fixes (this pass)

| Issue | Root cause | Fix | Status |
|---|---|---|---|
| Web push shows **twice** when React tab is backgrounded | (1) Same `device_token` notified via **both** `FcmChannel` and legacy `firebase` channel; (2) SW `showNotification` **plus** FCM auto-display when payload has `notification` | Block legacy `firebase` for Shipper in `FilterShipperNotificationBySettings`; SW skips `showNotification` when `payload.notification` exists (Android/iOS unchanged — web SW only) | Functional (code-verified) |
| Email CTA still Laravel Blade URLs | Hard-coded `route('shipper.*')` / bare `FirebaseMail` without React base | `config('app.react_email_link')` + `REACT_EMAIL_LINK` env; `NotificationCtaHelper` + `FirebaseMail` rewrite when flag=`1` | Functional when flag=1; flag=`0` keeps Laravel (default) |

Set in `.env`: `REACT_EMAIL_LINK=1` and `SHIPPER_PANEL_URL=<react origin>` for React CTAs.

---

## A. Preference-gated notification classes

| # | Notification class | Push | Email | In-app | Notes |
|---|---|---|---|---|---|
| A1–A6 | Availability family | Functional | Functional | Functional | Dual-channel + CTA helper |
| B1–B18 | Booking / bidding family | Functional | Functional | Functional | Dual-FCM fixed; `#` CTAs → load URL |
| P1–P16 | Shipment progress / POD | Functional | Functional | Functional | CTA helper where bare mail |
| C1–C9 | Cancellation family | Functional | Functional | Functional | CTA helper |
| M1 | Live chat socket FCM | Functional | N/A | N/A | SW no double-show |
| M2–M3 | Message Laravel | Functional | Functional | Functional | CTA → `/messages` |
| W1 | Weekly activity report | N/A | Functional | Functional | Dashboard via helper |

### Preference negative tests

| # | Scenario | Status |
|---|---|---|
| N1 | Disable Booking Bidding push | Functional |
| N2 | Disable Cancellation email | Functional |
| N3 | Disable Messages push | Functional |
| N4 | Disable Weekly Activity Report email | Functional |

**Note:** Database channel is not gated by push toggles.

---

## B. Always-on / system types

| # | Class area | Push | Email | Status |
|---|---|---|---|---|
| S1–S7 | Partners | Functional | Functional | CTA → `/partners` |
| S8–S11 | Billing / subscription | Functional | Functional | CTA → `/billing` |
| S12 | KYC accept/reject | Functional | Functional | Dual-channel blocked |
| S13 | Terms / privacy | Functional | Functional | CTA → `/settings/terms` |
| S14–S15 | Incentive / referral | Functional | Functional | CTA → `/dashboard` |
| S16 | Admin bulk topic | Functional | N/A | — |
| S17 | Shipment invite remind | Functional | Functional | — |

---

## C. Miro UI / settings (React)

| ID | Scenario | Status |
|---|---|---|
| NS-001–NS-022 | Listing, deep links, settings toggles | Functional |
| NS-002 / NS-036 | Entitlement upgrade modal | Partially (staging) |
| NS-023–025 | Sidebar badges realtime | Partially (staging) |
| NS-037 | Background tab: single FCM | Functional |
| NS-038 | Email CTA React vs Laravel flag | Functional |

---

## D. Fixes applied

1. Chat `push_messages` preference gate (socket)
2. Product FCM deep link `/products`
3. Negotiation / billing API CATEGORY/ACTION maps
4. Message type `message` + `openChat`
5. In-app DB not gated by push
6. Logout clears FCM device token
7. **Duplicate web push** — block legacy `firebase` for Shipper; SW skip double `showNotification`
8. **`react_email_link`** — `REACT_EMAIL_LINK` / `config('app.react_email_link')` for React vs Laravel email CTAs
9. PHPUnit: filter + CTA helper tests

---

## E. Staging smoke

- [ ] One event per category: Push + Email + In-app
- [ ] Push off → no FCM, in-app still appears
- [ ] Email off → no mail
- [ ] Messages push off → no chat FCM
- [ ] React tab backgrounded → **exactly one** OS notification
- [ ] `REACT_EMAIL_LINK=1` → React CTA; `=0` → Laravel CTA
- [ ] Android/iOS still receive single FCM (payload shape unchanged)
