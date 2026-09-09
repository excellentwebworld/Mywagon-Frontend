# PDS-959 — Edit Load QA Checklist

**Ticket:** [PDS-959](https://myvagon.atlassian.net/browse/PDS-959) — Shipper UI Revamp - Edit Load Page  
**Scope:** Phases 0–4 implemented on shipper `develop` + `MV_Backend_API` staging/API. Phase 5 = manual QA + doc closeout.  
**API contract:** [`EDIT_SHIPMENT_API_CONTRACT.md`](./EDIT_SHIPMENT_API_CONTRACT.md)  
**Miro cases:** `MV_Backend_API/miro/Shipper/EditShipment/Table-view.md` (SE-001…SE-030)

**Accepted by design (Phase 4):** Published edit with **no itinerary changes** still allows Step 2 Continue / Confirm Updated Itinerary. Do **not** fail this case for “confirm disabled.”

| Field | Value |
| --- | --- |
| Environment | Staging / local: ________ |
| Tester | ________ |
| Date | ________ |
| Build / commit | shipper `develop` + edit-shipment API |

---

## Backend automated coverage

Feature tests: `MV_Backend_API/tests/Feature/Api/Shipper/EditShipment/EditShipmentApiTest.php`

| Case | Covered by test | Local/CI result | Notes |
| --- | --- | --- | --- |
| Draft → edit API 404 | `test_draft_shipment_returns_404_on_edit_api` | ☐ Pass ☐ Fail ☑ Blocked | Local: `SQLSTATE[HY000] [1045] Access denied for user 'forge'@'localhost'` (2026-09-09). Rely on CI / staging DB. |
| GET seeds wizard + locked stops | `test_get_seeds_wizard_state_and_marks_locked_stops` | ☐ Pass ☐ Fail ☑ Blocked | Same forge DB blocker |
| Step-1 mutate locked stop → 422 | `test_step_one_rejects_mutating_locked_stop` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Multi-driver on-trip blocks mutate | `test_multi_driver_on_trip_blocks_mutating_endpoints` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Preview-diff field changes | `test_preview_diff_returns_field_level_changes` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Apply pending → live rewrite | `test_apply_on_pending_rewrites_live_rows` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Apply scheduled → shadow + clear wizard | `test_apply_on_scheduled_writes_pending_shadow_and_clears_wizard` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Cancel clears wizard only | `test_cancel_clears_wizard_without_touching_locations` | ☐ Pass ☐ Fail ☑ Blocked | Same |
| Apply with existing pending → 409 | `test_apply_returns_409_when_pending_update_already_exists` | ☐ Pass ☐ Fail ☑ Blocked | Same |

**Local smoke note (2026-09-09):** `php artisan test tests/Feature/Api/Shipper/EditShipment/EditShipmentApiTest.php` — 10 tests failed to connect (forge MySQL credentials). Suite exists and is the CI source of truth.

---

## Manual UI — Entry (SE-001…004, SE-030)

| ID | Check | Result | Notes |
| --- | --- | --- | --- |
| SE-001 | Manage: Edit on **Pending** opens `/shipments/create/step/1?editId={id}` | ☐ | |
| SE-030 | Detail: Edit on published opens `?editId=`; draft opens `?id=` | ☐ | |
| SE-002 | Fulfilled / Canceled: Edit not offered (or blocked) | ☐ | |
| SE-003 | On Trip + **multi-driver**: edit blocked with reason toast; no wizard | ☐ | |
| SE-004 | On Trip + **single driver**: edit opens; some stops may be locked | ☐ | |

---

## Manual UI — Step 1 Details (SE-005…015, SE-025…027)

| ID | Check | Result | Notes |
| --- | --- | --- | --- |
| SE-005 | Wizard hydrates stops / products / qty / locations | ☐ | |
| SE-006 | Header **Cancel** → `/shipments`; wizard discarded (no shadow) | ☐ | |
| SE-007 | On Trip: **Cancel** hidden | ☐ | |
| SE-008 | In-progress / completed stop fields locked | ☐ | |
| SE-009 | Future stops remain editable on partial On Trip | ☐ | |
| SE-010 | Scheduled / Ready / Past Due: **Update** → inconvenience modal | ☐ | |
| SE-011 | Dismiss modal → stay on Step 1 with form values | ☐ | |
| SE-012 | **Pending**: Update continues without modal | ☐ | |
| SE-013 | Draft edit uses create path (`?id=`), not edit-shipment | ☐ | |
| SE-014 / 015 | Date / same-location validations on editable rows | ☐ | |
| SE-025 / 026 | Add / delete unlocked cargo lines | ☐ | |
| SE-027 | Inline create location still works in edit mode | ☐ | |

---

## Manual UI — Step 2 Compare (SE-016…020)

| ID | Check | Result | Notes |
| --- | --- | --- | --- |
| SE-016 | After changes: **Current Load** / **Updated Load** toggle | ☐ | |
| — | Updated: only **changed** fields red | ☐ | |
| — | Current: read-only live itinerary; no confirm/vehicle | ☐ | |
| — | **No changes:** Continue still allowed (by design) | ☐ | |
| SE-017 | Edit / Back returns to Step 1 | ☐ | |
| SE-018 | **Keep Old Itinerary** discards and returns to Manage | ☐ | |
| SE-019 | **Confirm Updated Itinerary** → vehicle + continue to Step 3 | ☐ | |
| SE-020 | Draft create path: no Current/Updated toggle | ☐ | |
| — | Map markers swap when Current vs Updated addresses differ | ☐ | |

---

## Manual UI — Step 3 Apply (SE-022…024)

| ID | Check | Result | Notes |
| --- | --- | --- | --- |
| SE-022 | Vehicle / pricing prefilled from shipment | ☐ | |
| SE-023 | **Update Load** success → navigate Detail; toast shown | ☐ | |
| — | **Pending** apply: live rows rewritten; no Updated tab required | ☐ | |
| — | **Scheduled+** apply: Detail shows Updated/Old when shadow exists | ☐ | |
| — | Existing pending update: **409** toast; stay on Step 3 | ☐ | |
| SE-024 | Private partners preserved / editable within rules | ☐ | |

---

## Regression & viewport

| Check | Result | Notes |
| --- | --- | --- |
| Create new load / draft resume (`?id=`) unchanged | ☐ | |
| Desktop: toggle + footers usable | ☐ | |
| Narrow mobile: toggle + Cancel / Keep Old reachable | ☐ | |

---

## Sign-off

| Role | Name | Date | Sign |
| --- | --- | --- | --- |
| QA | | | ☐ |
| Product | | | ☐ |
| Eng | | | ☐ |

**Out of scope for PDS-959 Phase 5:** ShipmentDetail field-level red highlights (PDS-958); carrier accept/reject of pending update; Blade route removal.

---

## Phase 0–5 engineering summary (for Jira)

| Phase | Deliverable | Status |
| --- | --- | --- |
| 0–1 | Id-based `/api/shipper/v1/edit-shipment/{id}` + contract | Done |
| 2 | Create wizard `?editId=` load/save/apply + locks | Done (`develop`) |
| 3 | Step 2 Current/Updated + red highlights via preview-diff | Done (`develop`) |
| 4 | Cancel / Keep Old / inconvenience modal / 409 toast | Done (`develop`) |
| 5 | This QA checklist + mapping doc refresh | Done (manual UI rows open for QA) |

**Ready for:** human QA on staging using this checklist → then Done.

### Jira closeout (2026-09-09)

- Ticket moved to **Pending QA Validation** (not Done until checklist signed): https://myvagon.atlassian.net/browse/PDS-959
- Atlassian MCP could not persist an issue comment via transition `update.comment`; paste the Phase 0–5 summary above into a Jira comment if needed.
