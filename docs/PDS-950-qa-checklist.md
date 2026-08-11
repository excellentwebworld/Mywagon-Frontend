# PDS-950 — Support & Feedback QA Checklist

**Ticket:** [PDS-950](https://myvagon.atlassian.net/browse/PDS-950)  
**Page:** `/support`  
**Backend QA matrix:** [PDS-950-QA-TEST-RESULTS.md](../../MV_Backend_API/miro/Shipper/SupportAndFeedback/PDS-950-QA-TEST-RESULTS.md)  
**Release sign-off:** [PDS-950-PHASE8-RELEASE-SIGNOFF.md](../../MV_Backend_API/miro/Shipper/SupportAndFeedback/PDS-950-PHASE8-RELEASE-SIGNOFF.md)

**Prerequisites:** Migrations deployed (`kb_articles` included); entitled shipper account; KB articles seeded or created in admin; HubSpot env for Book a Call smoke.

---

## Automated (engineering)

- [x] `npm run build` passes
- [x] `npm test` passes (19 tests)
- [ ] `php artisan test tests/Feature/Api/Shipper/Support/` passes on CI/MySQL

---

## Phase 1 — Page shell & gating

- [ ] `/support` route loads without console errors
- [ ] Page header: title + subtitle (EN)
- [ ] Three quick action cards visible
- [ ] Quick actions scroll to KB / Requests / Book a Call sections
- [ ] Three collapsible sections expand/collapse
- [ ] Toggle locale EL — header, section titles, gate banner translate

### Gated shipper (no `feedback_and_support` permission)

- [ ] Amber gate banner visible
- [ ] KB, Requests, Book a Call sections show placeholder/disabled state
- [ ] Quick action click opens upgrade modal → `/subscription`
- [ ] No KB or feedback API calls in network tab

---

## Phase 2 — Knowledge Base

Requires `kb_articles` populated (seeder or admin panel).

- [ ] Expand KB section — categories grid loads
- [ ] Category badge shows article count
- [ ] Click category — article list loads
- [ ] Search query filters articles (debounced)
- [ ] Popular articles section when configured
- [ ] Open article — modal with title, tags, sanitized HTML body
- [ ] Close modal via X, Escape, overlay click
- [ ] EL locale — categories/articles use `lang=el`

---

## Phase 3 — Create Request

- [ ] Requests section → Create Request tab
- [ ] Form options load (type + category dropdowns)
- [ ] App reference read-only: MYVAGON Shipper Web Panel
- [ ] Submit with required fields — success message
- [ ] Ticket appears in My Requests tab
- [ ] Attachment: max 3 images; reject 4th
- [ ] Validation errors on missing required fields

---

## Phase 4 — My Requests

- [ ] My Requests tab — table with Ticket, Type, Title, Status, Created, Updated
- [ ] No Priority column
- [ ] Status pill colors/labels correct (EN)
- [ ] EL locale — status labels in Greek
- [ ] Click row — detail drawer opens
- [ ] Drawer shows ticket metadata (type, category, dates)

---

## Phase 5 — Book a Call

Requires HubSpot URLs on staging for full embed test.

- [ ] Expand Book a Call — meeting options load (lazy, on first expand)
- [ ] Four call-type pills: onboarding, technical, billing, feedback
- [ ] Pill with configured URL — HubSpot iframe/embed renders
- [ ] Pill with empty URL — fallback message (not broken iframe)
- [ ] Prefill shows shipper email/name where supported

---

## Phase 6 — Ticket thread

- [ ] Open ticket drawer — conversation thread visible
- [ ] First message matches original description
- [ ] Reply composer visible when ticket open (`can_reply`)
- [ ] Submit reply — appears in thread; drawer refresh persists
- [ ] Resolved ticket — composer hidden
- [ ] Admin adds reply in `admin/feedback` — appears in shipper thread

---

## Phase 7 — KB helpful feedback

- [ ] Open KB article modal — "Was this article helpful?" prompt visible
- [ ] Click Yes — buttons disable; thank-you label shown
- [ ] Network: `POST /support/kb/articles/{id}/feedback?lang=` returns 201
- [ ] Reopen same article in new session — local voted state resets (v1); DB row exists
- [ ] Click No — POST with `helpful: false`
- [ ] Gated user — no helpful prompt / no POST

---

## Cross-cutting

- [ ] EN → EL toggle updates all static Support strings
- [ ] No regressions on sidebar navigation to `/support`
- [ ] Mobile/responsive: sections usable at 768px width

---

## Sign-off

| Tester | Date | Environment | Result |
|--------|------|-------------|--------|
| | | Staging | Pending |
