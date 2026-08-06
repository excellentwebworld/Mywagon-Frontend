# PDS-935 - Shipper App UI Revamp: List Prices

## Priority
Highest

## Source
Captured from Jira ticket notes provided on 2026-08-06.

## Objective
Revamp the Lane Prices experience in the Shipper React app by simplifying pricing input, removing redundant UI, improving filters, preserving key controls, and enforcing lane conflict rules.

---

## 1) Add Lane Form Changes

### 1.1 Route
- Use the same address picker used in Address Book for both:
  - Origin
  - Destination
- Keep Add Stop.
- Replace roundtrip behavior with a toggle:
  - Direct Trip
  - Roundtrip
- Distance logic:
  - Direct Trip: lane km is calculated normally.
  - Roundtrip: lane km is Direct Trip x2.

### 1.2 Pricing Section (Complete Redesign)
- Remove the current pricing UI fields.
- New pricing is row-based. Each row must include:
  - Left: EUR amount input box.
  - Middle: pricing metric selector (single choice per row):
    - weight
    - unit of transport
    - FTL truck type
    - load (any size)
  - Right: metric-specific value selector/input:
    - weight: kg, ton
    - unit of transport: EUR pallets, US pallets, boxes, units, big bags
    - FTL truck type: existing 3-step vehicle/cargo picker
    - load (any size): per load (fixed, no additional choice)
- Add button to add more pricing rows.
- Constraint: only one row per metric type is allowed.

### 1.3 Remove Sections
- Remove Vehicle rates.
- Remove Weight breaks.

### 1.4 Keep As-Is
- Keep Validity and Scope exactly as today.

---

## 2) Top/Horizontal Controls

### 2.1 Horizontal Stats Filters
- Remove horizontal stats filters.
- Rationale: same filters already exist in the left vertical filter column.

### 2.2 Quote Calculator
- Keep and use Quote Calculator.
- Quote is calculated from lane prices available in the current library.
- Inputs and behavior:
  - Pickup location: dropdown of all origin locations from current library.
  - Dropoff location: show destination options that exist for selected pickup.
  - Quote result depends on:
    - quantity of pallets
    - weight
    - vehicle type

### 2.3 Audit Log / Settings / Import / Export
- Keep Audit log.
- Remove Settings.
- Keep Import:
  - Update import column fields for the new pricing model.
  - Provide index/reference of allowed entries for users.
- Keep Export:
  - Export to Excel/CSV.
  - Format must match import template format.

---

## 3) Lanes Table Changes

### 3.1 Columns and Sorting
- Keep all existing columns.
- Rename unit column label to metric.
- Ensure sorting is available for:
  - Metric (renamed from Unit)
  - Scope
  - Status

### 3.2 Expanded Row View
- Keep header.
- Route legs:
  - Keep km estimation for legs.
  - Remove tolls cost.
- Pricing detail:
  - Keep listing all pricing metrics.
  - Remove euro/km estimate.
  - Remove fuel surcharge.
- Keep:
  - History
  - Notes
  - Edit button
  - Archive button
  - Duplicate button

### 3.3 Duplicate Behavior
- Duplicate must open Add Lane form pre-filled with source lane data.
- User must not be able to save duplicate lane with exact same lane-defining fields.

### 3.4 Activation Toggle
- Add Activate/Deactivate action in expanded view:
  - Show Activate when lane is Inactive.
  - Show Deactivate when lane is Active.

---

## 4) Lane Conflict Rules

Cannot have two lanes simultaneously when all below are true:
- same origin location
- same destination location
- overlapping validity time window
- same carrier base in list

System must block save and show a clear conflict error.

---

## 5) Left Filters

### 5.1 Keep Existing
- All Lanes (default)
- Active
- FTL (lanes with per vehicle FTL truck type price)
- Multistop (more than 2 stops)
- By Scope
- Inactive
- Archived

### 5.2 Add New
- Per unit of transport
- Per weight
- Per load (any size)
- Expiring soon (expiration date in less than 14 days)
- Direct Trip
- Simple Lane (strictly 2 stops)

### 5.3 Keep Existing Roundtrip Filter
- Round trip

### 5.4 Remove
- My Folders

---

## 6) Acceptance Criteria

### 6.1 Add Lane
- User can search and select addresses for origin/destination using Address Book style picker.
- User can toggle Direct Trip vs Roundtrip and km updates accordingly.
- Pricing rows support all four metrics with proper value options.
- No duplicate metric rows can be created.

### 6.2 Data and Validation
- Duplicate save validation prevents exact lane duplicates.
- Conflict rule validation prevents overlapping conflicting lanes.
- Existing Validity and Scope behavior remains unchanged.

### 6.3 Table and Actions
- Metric column is shown and sortable.
- Scope and Status sorting are available.
- Expanded row hides removed fields and retains required controls.
- Duplicate opens pre-filled Add Lane form.
- Activate/Deactivate button appears correctly by status.

### 6.4 Filters and Calculator
- New filters return correct subsets.
- Removed filters/sections are not visible.
- Quote Calculator dropdown dependencies and calculations work using current library data.

### 6.5 Import/Export
- Import accepts updated column schema and metric entries.
- Export format is aligned with the import template.

---

## 7) Implementation Notes (for upcoming development)
- Reuse shared address picker component used by Address Book.
- Reuse existing 3-step FTL vehicle/cargo picker.
- Define a canonical lane uniqueness key for duplicate prevention checks.
- Update frontend DTOs/types for metric-based pricing rows.
- Update import parser and export mapper to match new schema.
- Add regression tests for filters, duplicate rules, and quote calculator dependencies.

---

## 8) Phased Delivery Plan

### Current Status (as of 2026-08-06)
- Phase 1: Done
- Phase 2: In Progress (API-backed create/edit + status transitions and modal validation/localization updates done; live QA signoff pending)
- Phase 3: In Progress (exact-duplicate and active route+trip checks implemented; full overlap+carrier-base conflict rule pending)
- Phase 4: Done
- Phase 5: In Progress
- Phase 6: In Progress
- Phase 7: Planned

### Phase 1: Foundations and Data Contract
- Align frontend lane pricing types and payload contracts with the new metric-row model.
- Define enums/constants for metrics and metric value options.
- Introduce helper utilities for:
  - metric uniqueness validation per lane
  - direct vs roundtrip km derivation
  - simple lane vs multistop classification
- Exit criteria:
  - Types compile with no regressions.
  - Existing lane list and lane detail screens still render.
  - Status: Done
  - Done points:
    - Introduced metric-row capable lane handling in frontend flow via `pricingRows` normalization and legacy mapping compatibility.
    - Added dedicated backend lane storage contract foundation through new lane table and API payload shaping.
    - Added migration-level support for trip/scope/status dimensions with safe indexing for MySQL utf8mb4.

### Phase 2: Add Lane Form Revamp
- Replace route origin/destination inputs with Address Book style address picker.
- Keep Add Stop behavior unchanged.
- Add Direct Trip/Roundtrip toggle and wire lane km logic.
- Replace current pricing UI with row-based pricing builder:
  - EUR input
  - metric selector
  - metric-specific right-side control
  - add-row flow
  - one-row-per-metric enforcement
- Remove Vehicle rates and Weight breaks sections.
- Keep Validity and Scope unchanged.
- Exit criteria:
  - User can create a lane with each metric type.
  - Duplicate metric selection is blocked in the UI.
  - Status: In Progress
  - Done points:
    - Replaced Add/Edit Lane entry with new `AddEditLaneModalV2` and wired it into Price Lists page flow.
    - Implemented route picker with Address Book-style location selection and Add Stop handling.
    - Implemented Direct Trip/Roundtrip toggle and effective km derivation in modal.
    - Implemented row-based pricing editor with one-row-per-metric enforcement.
    - Removed Vehicle Rates and Weight Breaks from Phase 2 modal implementation.
    - Updated localization usage in modal and location picker (EN/EL keys added and fallbacks applied).
    - Wired Add/Edit save to Price Lists API service (`storeLane` / `updateLane`) with save-state guard in UI.
    - Added API lane -> UI lane and UI lane -> API payload mapping in page orchestration.
    - Added API-first lane list hydration on page load with safe mock fallback.
    - Added inline field-level validation surfaces in modal for amount, duplicate metric, and invalid metric value states.
    - Enforced mandatory 3-step picker flow for `ftl_truck_type` metric values (including truck type selection requirement).
    - Persisted activate/deactivate/reactivate status transitions through API for API-backed lanes with local fallback for mock lanes.
  - Remaining:
    - Final UX parity checks on all validation/error states in live UI.
    - End-to-end manual QA evidence capture for create/edit/status transition flows.

### Phase 3: Lane Save Validation and Conflict Rules
- Implement duplicate save prevention for exact same lane-defining fields.
- Implement overlap conflict rule by origin + destination + time window + carrier base.
- Add explicit error surfaces in form submit response handling.
- Exit criteria:
  - Conflicting lanes cannot be saved.
  - Error messages are user-readable and actionable.
  - Status: In Progress
  - Done points:
    - Added backend duplicate prevention for active same-route + same-trip type lanes.
    - Added validation surfaces from backend-form request/controller flow for lane creation/update.
    - Added backend overlap conflict engine with HTTP 409 lane_conflict_overlap response.
    - Added frontend inline conflict/error mapping in Phase 2 modal and page save flow.
    - Added EN/EL localized conflict messages for overlap and duplicate lane states.
    - Added backend feature tests covering overlap conflict, adjacent non-overlap, and update self-exclusion cases.
  - Remaining:
    - Expand/adjust scope-overlap matrix if business rules require finer carrier-base semantics.
    - Run manual QA signoff for conflict create/update and localization states.

### 11.10 Task Tracker (Live)
Last updated: 2026-08-06

Legend:
- [x] Done
- [~] In Progress
- [ ] Pending

#### A) Backend Conflict Tasks
- [x] Exact duplicate active route + trip guard remains active.
- [x] Add overlap query helper for price lanes.
- [x] Return HTTP 409 with stable lane_conflict_overlap code.
- [x] Include conflict metadata in backend response.
- [~] Confirm whether carrier-base semantics need tighter business-rule refinement beyond current scope overlap matrix.

#### B) Frontend Error Tasks
- [x] Keep client-side duplicate warning.
- [x] Await API save in modal and capture backend errors inline.
- [x] Map 409 conflict into localized banner/error message.
- [x] Map backend field errors to row/section validation state.
- [x] Keep generic fallback for unknown failures.

#### C) Localization Tasks
- [x] Add EN conflict messages.
- [x] Add EL conflict messages.
- [x] Keep fallback text for runtime safety.

#### D) QA Tasks
- [x] Add backend feature test coverage for overlap pass/fail and self-exclusion.
- [x] Complete executed test run and confirm all new Phase 3 tests pass.
- [ ] Manual QA for overlap, adjacent-date, and update self-exclusion cases.

### Phase 4: Table, Expanded View, and Actions
- Rename Unit column label to Metric.
- Enable sorting on Metric, Scope, and Status columns.
- Expanded row updates:
  - remove tolls cost
  - remove euro/km estimate
  - remove fuel surcharge
  - keep pricing metrics, history, notes, edit, archive, duplicate
- Add Activate/Deactivate action based on current lane status.
- Duplicate action must open pre-filled Add Lane form.
- Exit criteria:
  - Updated expanded view fields match requirements.
  - Duplicate and activate/deactivate flows work end-to-end.
  - Status: Done

### 12) Detailed Plan - Phase 4 (Table, Expanded View, and Actions)

### 12.1 Goal
Refactor the lane list and expanded lane drawer so the table and actions match the new metric-based pricing model, while preserving existing lane browsing, selection, and duplicate workflows.

### 12.2 Current State Snapshot
- The table still renders the legacy Unit column and legacy pricing-oriented labels.
- Sorting exists in the table, but Metric/Scope/Status coverage is not fully aligned to the final PDS-935 spec.
- The detail drawer still shows legacy sections that must be removed in Phase 4:
  - tolls cost in route legs
  - euro/km derived pricing display
  - fuel surcharge
  - Vehicle Rates section
  - Weight Breaks section
- Duplicate, archive, and reactivate actions exist, but duplicate prefill and activate/deactivate behavior still need the final Phase 4 UX contract.

### 12.3 Phase 4 Scope (Backend)

#### A) Read Model and Response Shape
- Ensure list and detail responses include everything needed by the table and expanded drawer without requiring extra client-side heuristics.
- Keep price lane responses stable for:
  - route display
  - stop count display
  - total kilometers
  - pricing rows
  - status
  - scope
  - effective window
  - notes
  - action state derivation

#### B) Action Readiness
- Expose status update semantics clearly for active/inactive/archived lanes.
- Keep duplicate target data available so the frontend can prefill a new Add Lane modal from an existing lane.

### 12.4 Phase 4 Scope (Frontend)

#### A) Table Updates
- Rename the Unit column to Metric.
- Keep all existing columns that are still relevant to the product experience.
- Ensure sorting is available and reliable for:
  - Metric
  - Scope
  - Status
- Preserve current list behaviors:
  - row selection
  - pagination
  - route display
  - status badge rendering

#### B) Expanded Row Updates
- Remove obsolete lane detail sections and values:
  - tolls cost in route legs
  - euro/km estimate in pricing summary
  - fuel surcharge in pricing summary
  - Vehicle Rates section
  - Weight Breaks section
- Keep required information and actions:
  - route legs with km estimation
  - pricing metrics list
  - history
  - notes
  - edit
  - archive
  - duplicate

#### C) Action Behavior
- Duplicate must open the Add Lane modal prefilled with the source lane data.
- Add Activate action when the lane is inactive.
- Add Deactivate action when the lane is active.
- Keep archive and reactivate flows intact where they still apply.

#### D) UX and Localization
- Ensure all new or changed labels are localized.
- Make sure the expanded drawer and table do not show raw translation keys.

### 12.5 Shared FE/BE Alignment Tasks
- Align the lane shape used by the table and detail drawer with the API response shape used in Phase 2 and Phase 3.
- Confirm how duplicate prefill maps from an existing lane into the Add Lane modal.
- Confirm which fields are shown in the list view versus the expanded drawer to avoid duplicated or stale UI.
- Align status transition semantics for active/inactive/archived states.

### 12.6 Sequence (Execution Order)
1. Finalize the table display contract and remove the Unit label dependency.
2. Update table sorting logic for Metric, Scope, and Status.
3. Remove outdated expanded row sections and derived-cost displays.
4. Wire duplicate prefill from detail and table actions into the Add Lane modal.
5. Add active/inactive action controls in the expanded drawer.
6. Verify status transitions, duplicate, and archive behaviors together.
7. Run visual and regression checks on list/detail browsing after the new rendering logic.

### 12.7 Deliverables
- Updated Price Lists table with Metric label and final sort behavior.
- Updated detail drawer with removed legacy sections and preserved required sections.
- Working duplicate prefill behavior for Add Lane.
- Working Activate/Deactivate action in the expanded view.
- Updated table/detail localization coverage.

### 12.8 Risks and Mitigations
- Risk: the table continues to rely on legacy data assumptions for route and unit rendering.
  - Mitigation: keep a mapping layer for backward compatibility while switching labels and action logic.
- Risk: removing detail sections may accidentally hide required pricing data.
  - Mitigation: verify each retained metric display against the acceptance criteria in section 6.
- Risk: duplicate prefill can drift from the source lane payload.
  - Mitigation: reuse the same modal normalization helpers for create, edit, and duplicate entry paths.
- Risk: active/inactive action states may conflict with archived behavior.
  - Mitigation: keep status transition rules explicit in the detail action renderer and test them separately.

### 12.9 Definition of Done (Phase 4)
- The table shows Metric instead of Unit and sorts correctly by Metric, Scope, and Status.
- The expanded drawer removes tolls cost, euro/km, fuel surcharge, Vehicle Rates, and Weight Breaks.
- The expanded drawer still shows route legs, pricing metrics, history, notes, edit, archive, and duplicate.
- Duplicate opens a prefilled Add Lane form.
- Active lanes show Deactivate and inactive lanes show Activate in the expanded view.
- No blocking regressions remain in list rendering, detail rendering, or selection behavior.

### 12.10 Task Tracker (Live)
Last updated: 2026-08-06

Legend:
- [x] Done
- [~] In Progress
- [ ] Pending

#### A) Table Tasks
- [x] Rename Unit column to Metric.
- [x] Ensure sorting on Metric, Scope, and Status.
- [x] Keep selection, pagination, and route display stable.

#### B) Expanded Drawer Tasks
- [x] Remove tolls cost display.
- [x] Remove euro/km estimate display.
- [x] Remove fuel surcharge display.
- [x] Remove Vehicle Rates section.
- [x] Remove Weight Breaks section.
- [x] Keep history, notes, edit, archive, duplicate.

#### C) Actions Tasks
- [x] Duplicate opens Add Lane prefilled from source lane.
- [x] Show Activate for inactive lanes.
- [x] Show Deactivate for active lanes.
- [x] Preserve archive/reactivate behavior where still applicable.
- [x] Block exact-duplicate save in duplicate mode (client-side fingerprint guard).

#### D) Localization and QA Tasks
- [x] Localize all new table and drawer copy.
- [ ] Run regression check on list and detail browsing after changes.
- [ ] Run manual QA for action visibility and duplicate prefill.

### Phase 5: Filters and Quote Calculator
- Remove horizontal stats filters.
- Update left filter set:
  - add Per unit of transport, Per weight, Per load (any size), Expiring soon, Direct Trip, Simple Lane
  - keep existing required filters
  - remove My Folders
- Keep Quote Calculator and update behavior:
  - pickup dropdown from current lane origins
  - dependent dropoff dropdown from selected pickup
  - quote calculation by pallets, weight, vehicle type and available lane pricing
- Exit criteria:
  - Filter counts and results match expected lane subsets.
  - Calculator dependencies and quote outputs are correct.
  - Status: Planned

### Phase 6: Import/Export Parity
- Update import template columns for metric-row pricing schema.
- Add import reference/index for accepted values.
- Update export mapping to mirror import template format in Excel/CSV.
- Exit criteria:
  - Import accepts valid rows and rejects invalid metric/value combinations.
  - Export can round-trip back through import without data loss.
  - Status: Planned

### Phase 7: QA, Regression, and Release Readiness

### 15) Detailed Plan - Phase 7 (QA, Regression, and Release Readiness)

### 15.1 Goal
Validate the lane-price revamp end to end with evidence-based QA and release gates so the feature can be signed off with confidence across frontend, backend, localization, and deployment readiness.

### 15.2 Current State Snapshot
- Phase 1 is complete.
- Phase 2 and Phase 3 are partially delivered and still need manual verification in live UI paths.
- Phase 4, Phase 5, and Phase 6 are implemented in varying degrees and must be regression tested together because they share the same Price Lists page surface.
- No dedicated frontend UI test runner exists in this workspace for this flow, so Phase 7 must rely on build/lint gates plus manual smoke evidence.

### 15.3 Phase 7 Scope (Backend)

#### A) Regression Coverage
- Re-run the existing Laravel price-lane feature tests that cover create, update, duplicate prevention, and overlap conflict behavior.
- Confirm the backend still returns stable validation payloads for the modal and page-level save paths.
- Verify that update self-exclusion, adjacent validity windows, and conflict metadata remain correct after the latest frontend contract changes.

#### B) Diagnostics and Stability
- Review backend logs during QA for validation exceptions, unexpected 500s, or serialization issues.
- Confirm the API response shape still matches the frontend adapter layer for list, detail, save, import, and export flows.

### 15.4 Phase 7 Scope (Frontend)

#### A) Build and Lint Gates
- Run the frontend lint and build steps before manual QA begins.
- Treat any TypeScript, JSX, or bundle failure as a release blocker until fixed or triaged.

#### B) Functional Smoke Coverage
- Validate create, edit, duplicate, archive, activate, deactivate, and detail-drawer flows.
- Validate left filters, table sorting, calculator dependencies, and import/export behavior on the same page after reload.

#### C) Localization QA
- Verify EN and EL runtime strings for the modal, drawer, import/export, filters, and calculator.
- Confirm no raw translation keys appear in the live UI.

### 15.5 Manual QA Matrix

#### A) Add/Edit Lane
- Create a lane with each pricing metric type.
- Verify direct and roundtrip toggles update the km summary correctly.
- Verify one-row-per-metric enforcement blocks duplicate metric rows.
- Verify duplicate-preload opens the Add Lane modal with the source lane data.
- Verify save errors surface clearly for duplicate and conflict cases.

#### B) Table and Expanded View
- Confirm the metric column label renders correctly and sorts as expected.
- Confirm scope and status sorting still work.
- Confirm the expanded drawer hides removed fields and keeps route legs, history, notes, edit, archive, duplicate, and activate/deactivate actions.

#### C) Filters and Calculator
- Confirm the left filter set includes the updated lane-class filters and excludes My Folders.
- Confirm the calculator pickup/dropoff dependency works from the current lane library.
- Confirm quote results reflect the available lane pricing rows for pallets, weight, and vehicle type inputs.

#### D) Import and Export
- Download the template and confirm the headers and sample rows match the canonical metric-row schema.
- Import at least one valid file and one invalid file.
- Confirm row-level preview errors are visible and actionable.
- Export a representative lane set and verify the file can round-trip back through import without losing lane identity or pricing rows.

### 15.6 Edge-Case and Regression Matrix
- Validate multistop and roundtrip combinations.
- Validate expiring-soon boundaries around the 14-day threshold.
- Validate conflict behavior near overlapping validity edges.
- Validate inactive, active, and archived status transitions in the drawer.
- Validate compatibility paths for legacy-adapter lane data where still supported.

### 15.7 Release Gates
- Backend PHPUnit passes for the price-lane feature suite.
- Frontend lint and build pass.
- Manual QA evidence is complete for the acceptance criteria in section 6.
- No blocking defects remain in create, edit, duplicate, archive, activate, deactivate, filters, calculator, or import/export.

### 15.8 Deployment Validation

#### A) Staging Readiness
- Use the existing staging deployment script flow as the operational reference: pull latest code, install dependencies if required, swap the staging env file, run migrations, clear caches, and restart the queue.
- Verify the staging environment matches the expected branch before QA signoff.

#### B) Production Readiness
- Treat the production deployment script as the final operational checklist.
- Confirm maintenance mode, migrations, cache clear, and queue restart succeed without breaking the lane pages.

### 15.9 Deliverables
- QA report with pass/fail evidence for each acceptance criterion.
- Regression notes for any issues found during smoke or edge-case testing.
- Release readiness signoff checklist with any residual risk documented explicitly.

### 15.10 Definition of Done (Phase 7)
- All acceptance criteria in section 6 are verified with evidence.
- No blocking regressions remain in lane price management.
- Backend and frontend release gates are green.
- Manual QA, regression, localization, and deployment validation are complete.

### 15.11 Task Tracker (Live)
Last updated: 2026-08-06

Legend:
- [x] Done
- [~] In Progress
- [ ] Pending

#### A) Backend QA Tasks
- [ ] Re-run price-lane feature tests for create, update, duplicate, and overlap conflict coverage.
- [ ] Verify update self-exclusion and adjacent-date boundaries.
- [ ] Review backend logs for unexpected errors during smoke.

#### B) Frontend QA Tasks
- [ ] Run lint and build gates successfully.
- [ ] Validate create, edit, duplicate, archive, activate, and deactivate flows.
- [ ] Validate table, drawer, filters, calculator, and import/export flows.

#### C) Localization Tasks
- [ ] Verify EN and EL runtime copy across modal, drawer, filters, calculator, and import/export.
- [ ] Confirm no raw translation keys are visible in the UI.

#### D) Release Tasks
- [ ] Complete staging deployment validation.
- [ ] Complete production readiness checklist.
- [ ] Record final QA signoff and any residual follow-up items.

---

## 9) Detailed Plan - Phase 1 (Full-Stack Foundations)

### 9.1 Goal
Create a stable shared contract between frontend and backend for the new metric-row lane pricing model before UI replacement work starts.

### 9.2 Current State Snapshot
- Frontend Price Lists currently uses mock lane data and legacy pricing fields (perLoad, perPallet, perKm, perKg, perTonne), plus Vehicle Rates and Weight Breaks.
- Frontend Add/Edit and Quote Calculator logic currently depends on removed concepts (vehicle rates, weight breaks, fuel surcharge for quote flow).
- Backend shipper partner lane endpoint currently supports only:
  - origin_city
  - destination_city
  - price
  - unit (load or pallet)
- Backend does not yet expose a full metric-row lane pricing contract required by PDS-935.

### 9.3 Phase 1 Scope (Backend)

#### A) Contract Design
- Define new lane pricing row schema:
  - price_eur (decimal)
  - metric (weight | unit_transport | ftl_truck_type | load_any_size)
  - metric_value:
    - weight: kg | ton
    - unit_transport: eur_pallet | us_pallet | box | unit | big_bag
    - ftl_truck_type: 3-step vehicle/cargo payload
    - load_any_size: per_load
- Define lane-level fields for route type:
  - trip_type (direct | roundtrip)
  - total_km_direct
  - total_km_effective
- Define duplicate/conflict validation key fields.

#### B) Data Layer Prep
- Create migrations for lane pricing row support (or equivalent normalized structure).
- Add model updates/casts and relations.
- Keep backward compatibility where possible for existing consumer paths.

#### C) API Prep
- Expand request validation classes to accept metric-row pricing payloads.
- Add response resource shape for metric rows and trip type fields.
- Add server-side guard for one-row-per-metric rule.
- Add placeholder conflict-rule validator contract (full enforcement in later phase).

#### D) Backend Test Prep
- Add request validation tests for accepted/rejected metric rows.
- Add response contract snapshot tests for the new lane payload.

### 9.4 Phase 1 Scope (Frontend)

#### A) Types and Domain Model
- Introduce shared UI types/constants for:
  - PricingMetric
  - PricingMetricValue
  - LanePricingRow
  - TripType
- Deprecate direct reliance on legacy price fields in new code paths.

#### B) Mapping/Adapter Layer
- Add adapter utilities:
  - API lane -> UI lane model
  - UI lane model -> API payload
- Include compatibility mapper so current screens still render while migration is ongoing.

#### C) Pure Helper Utilities
- Add helpers for:
  - per-metric uniqueness checks
  - direct/roundtrip km derivation
  - simple-lane vs multistop classification
  - metric label normalization for table/filter usage

#### D) Integration Readiness
- Wire feature flag or compatibility switch so new contract can be integrated without breaking existing mock-driven pages.
- Add unit tests for mappers/helpers with direct and roundtrip scenarios.

### 9.5 Shared FE/BE Alignment Tasks
- Produce one canonical JSON example for:
  - create lane payload
  - lane detail response
  - quote calculator input contract
- Freeze enum values to avoid FE/BE string drift.
- Define error code map for:
  - duplicate_metric
  - exact_duplicate_lane
  - lane_conflict_overlap

### 9.6 Sequence (Execution Order)
1. Finalize schema and enum dictionary (FE+BE).
2. Implement backend migration/model/validation/resource updates.
3. Implement frontend types, adapters, and helpers against frozen contract.
4. Add automated tests for both layers.
5. Run integration smoke checks with sample payloads.

### 9.7 Deliverables
- Backend:
  - migration(s)
  - updated model(s)
  - updated request/resource/service contract
  - validation and contract tests
- Frontend:
  - new lane pricing domain types/constants
  - adapter/mapping utilities
  - helper utilities for metrics/trip/lane-type logic
  - unit tests for helpers and mappers
- Documentation:
  - contract examples
  - enum index/reference table

### 9.8 Risks and Mitigations
- Risk: existing frontend is partly mock-based and may diverge from backend contract.
  - Mitigation: adapter compatibility layer and frozen JSON contract examples.
- Risk: backend currently has minimal lane fields.
  - Mitigation: introduce additive schema changes and keep legacy fields until Phase 2 UI cutover.
- Risk: enum mismatch between frontend and backend.
  - Mitigation: single source enum index in docs and mirrored constants in code.

### 9.9 Definition of Done (Phase 1)
- FE and BE agree on the same lane pricing row contract and enum values.
- Backend accepts and returns the new metric-row payload shape in non-breaking form.
- Frontend compiles and can consume the new contract through adapters.
- Core helpers and validations are covered with automated tests.
- No regressions on current lane listing/detail render paths.

---

## 10) Detailed Plan - Phase 2 (Add Lane Form Revamp)

### 10.1 Goal
Ship a production-ready Add/Edit Lane experience aligned with PDS-935 route and pricing UX, while preserving compatibility with existing page orchestration.

### 10.2 Current State Snapshot
- New `AddEditLaneModalV2` is implemented and active in Price Lists flow.
- Route section supports location picker + multistop + direct/roundtrip toggle.
- Row-based pricing builder is implemented with per-metric uniqueness.
- Localization is implemented for new modal and picker keys (EN/EL).
- Page-level save is still partly local-state/mock-driven and not fully API-backed.

### 10.3 Phase 2 Scope (Backend)

#### A) API Readiness for Form UX
- Keep `index/store/update` price-list lane endpoints stable.
- Ensure payload normalization accepts metric rows and legacy-compatible derived fields.
- Ensure validation messages are explicit and mappable to form-level errors.

#### B) Compatibility Guarantees
- Maintain non-breaking response shape for existing page consumption.
- Ensure default values are returned for optional fields used by modal sections.

### 10.4 Phase 2 Scope (Frontend)

#### A) Route UX
- Finalize Address Book style location flow for origin/destination and stops.
- Ensure stop removal and ordering logic is stable across edit/create modes.
- Keep direct/roundtrip computation consistent in route summary and payload.

#### B) Pricing UX
- Keep one-row-per-metric restriction at interaction level.
- Finalize right-side metric value controls:
  - weight unit selector
  - unit transport selector
  - FTL 3-step selector integration
  - fixed per-load behavior
- Keep add/remove pricing row actions predictable and validated.

#### C) Validity and Scope
- Preserve existing behavior for dates/scope direction.
- Ensure date-order and required-field validation messages are localized.

#### D) Localization and UX Copy
- Keep all user-visible strings under i18n keys.
- Ensure no raw translation keys leak in EN/EL runtime paths.

### 10.5 Shared FE/BE Alignment Tasks
- Lock request/response examples for modal submit/edit.
- Map backend validation errors to specific frontend field errors.
- Confirm `pricingRows` normalization rules and metric value schema.

### 10.6 Sequence (Execution Order)
1. Freeze modal submit payload examples.
2. Wire create/edit to dedicated API service in page layer.
3. Verify edit prefill from API response contracts.
4. Validate localized error mapping in EN/EL.
5. Run end-to-end create/edit smoke validation.

### 10.7 Deliverables
- Frontend:
  - production-ready Add/Edit modal behavior
  - API-integrated save/edit flow
  - localized validation and helper text
- Backend:
  - stable form-consumable lane responses
  - deterministic validation payloads
- Documentation:
  - updated submit/edit contract examples

### 10.8 Risks and Mitigations
- Risk: page still relies on mock-oriented local state.
  - Mitigation: stage API integration behind adapter layer first, then swap save source.
- Risk: localization regressions in dynamic labels.
  - Mitigation: enforce fallback text and locale key audit in QA checklist.

### 10.9 Definition of Done (Phase 2)
- Add/Edit modal fully matches required route + pricing UX behavior.
- Create and edit actions persist through backend API (not local-only).
- Validation and helper/error text is localized and user-readable.
- No raw translation keys appear in EN/EL runtime UI.

### 10.10 Task Tracker (Live)
Last updated: 2026-08-06

Legend:
- [x] Done
- [~] In Progress
- [ ] Pending

#### A) Backend/API Tasks
- [x] Keep dedicated endpoints available for list/store/update.
- [x] Accept metric-row payload with legacy-compatible normalization.
- [x] Keep duplicate active same-route + same-trip save guard.
- [x] Return/propagate backend validation errors with consistent field-code mapping for frontend inline rendering.

#### B) Frontend Modal Tasks
- [x] Use Address Book style location picker for origin/destination.
- [x] Keep Add Stop behavior with bounded stop list.
- [x] Support Direct Trip/Roundtrip toggle and effective km summary.
- [x] Implement row-based pricing builder with one-row-per-metric enforcement.
- [x] Remove Vehicle Rates and Weight Breaks from Phase 2 modal.
- [x] Keep Validity and Scope behavior in modal.
- [x] Add save-state guard to prevent duplicate submits.

#### C) Localization Tasks
- [x] Replace hardcoded modal strings with i18n keys where updated.
- [x] Add missing EN keys for modal/picker Phase 2 paths.
- [x] Add missing EL keys for modal/picker Phase 2 paths.
- [x] Add EN/EL keys for inline row validation (`priceRequired`, `metricDuplicate`, `metricValueRequired`).
- [~] Complete runtime parity verification for all validation/error states across EN/EL.

#### D) Page Integration Tasks
- [x] Wire create action to API `storeLane`.
- [x] Wire update action to API `updateLane` for API-backed records.
- [x] Keep compatibility fallback for legacy local/mock lanes during transition.
- [x] Add API-first lane hydration on page load.
- [~] Migrate remaining local-only edit/update actions (archive/delete) to API endpoints when backend routes are available.

#### E) QA/Verification Tasks
- [x] Static diagnostics pass on touched files (no file-level errors).
- [ ] End-to-end create/edit smoke for all 4 metrics against API data.
- [ ] Validation negative-path QA (duplicate metric, duplicate lane, date-order).
- [ ] Regression QA for list/detail rendering after API save + reload.

---

## 11) Detailed Plan - Phase 3 (Lane Save Validation and Conflict Rules)

### 11.1 Goal
Enforce all lane uniqueness and overlap conflict business rules on save/update with explicit, actionable errors.

### 11.2 Current State Snapshot
- Duplicate same-route + same-trip active lane guard exists.
- Full overlap time-window + carrier-base conflict logic is not yet complete.
- Error codes and frontend mapping are partially implemented.

### 11.3 Phase 3 Scope (Backend)

#### A) Validation Rules
- Implement exact duplicate checks for lane-defining fields.
- Implement overlap conflict rule across:
  - origin
  - destination
  - overlapping validity range
  - same carrier base/list context

#### B) Error Contract
- Standardize machine codes and message strings:
  - `duplicate_metric`
  - `exact_duplicate_lane`
  - `lane_conflict_overlap`
- Ensure update flow excludes current lane id from self-conflict.

#### C) Automated Tests
- Add tests for non-overlap pass cases and overlap fail cases.
- Add boundary tests for adjacent dates and open-ended validity.

### 11.4 Phase 3 Scope (Frontend)

#### A) Submit Error Handling
- Map backend error codes to inline/modal-level messages.
- Keep messages contextual to route, date, and scope fields.

#### B) UX Guardrails
- Keep pre-submit checks for obvious duplicates.
- Do not rely only on client-side checks; always trust backend final decision.

### 11.5 Shared FE/BE Alignment Tasks
- Freeze conflict definition examples (valid vs invalid).
- Align timezone/date normalization rules for overlap calculations.

### 11.6 Sequence (Execution Order)
1. Finalize exact-duplicate field set.
2. Implement overlap + carrier-base validation in backend.
3. Add/update tests and edge boundaries.
4. Wire frontend code-based error mapping.
5. Verify rejection and success flows end-to-end.

### 11.7 Deliverables
- Backend conflict validators and tests.
- Frontend error mapping surfaces.
- Shared examples for acceptance QA.

### 11.8 Risks and Mitigations
- Risk: ambiguous carrier-base interpretation between contexts.
  - Mitigation: codify one rule matrix in docs and tests.
- Risk: date overlap bugs around null end dates.
  - Mitigation: explicit interval model and boundary test coverage.

### 11.9 Definition of Done (Phase 3)
- All required conflict scenarios are blocked reliably.
- Error payloads are stable and mapped correctly in UI.
- Update/create flows behave consistently for edge windows.

---

## 12) Detailed Plan - Phase 4 (Table, Expanded View, and Actions)

### 12.1 Goal
Refactor list and expanded lane details to match required fields/actions while preserving performance and usability.

### 12.2 Current State Snapshot
- Table currently contains legacy-oriented metric/unit render paths.
- Expanded row still contains items scheduled for removal in final PDS behavior.
- Activate/Deactivate dedicated action in expanded context is pending.

### 12.3 Phase 4 Scope (Backend)

#### A) Read Model Support
- Ensure list/detail response includes all fields needed for sorting and expanded action controls.
- Ensure status transitions are supported by dedicated update paths.

### 12.4 Phase 4 Scope (Frontend)

#### A) Columns and Sorting
- Rename Unit display label to Metric.
- Enable and verify sorting by Metric, Scope, and Status.

#### B) Expanded Row Cleanup
- Remove toll cost, euro/km estimate, fuel surcharge displays.
- Keep pricing metrics, history, notes, edit, archive, duplicate controls.

#### C) Actions
- Add Activate/Deactivate action by current status.
- Ensure duplicate opens prefilled Add Lane modal.

### 12.5 Shared FE/BE Alignment Tasks
- Confirm sort keys and server/client sorting responsibilities.
- Confirm expanded payload shape for removed vs retained fields.

### 12.6 Sequence (Execution Order)
1. Align list/detail response for table needs.
2. Update table headers, sort logic, and renderers.
3. Update expanded content and actions.
4. Validate duplicate prefill behavior with API data.

### 12.7 Deliverables
- Updated table columns/sort behavior.
- Clean expanded view matching requirements.
- Working activate/deactivate and duplicate flows.

### 12.8 Risks and Mitigations
- Risk: regressions in existing table filters/sorting.
  - Mitigation: add regression checks for ordering and status transitions.

### 12.9 Definition of Done (Phase 4)
- Table and expanded row behavior match section 3 requirements exactly.
- Action flows (duplicate, activate/deactivate, archive) work without regressions.

---

## 13) Detailed Plan - Phase 5 (Filters and Quote Calculator)

### 13.1 Goal
Deliver the final filter model and calculator behavior using the current lane library as source of truth.

### 13.2 Current State Snapshot
- Horizontal stats filter removal is pending completion review.
- Left filter additions and removals are not fully finalized.
- Calculator flow exists but needs dependency and pricing model parity verification.

### 13.3 Phase 5 Scope (Backend)

#### A) Query/Filter Support
- Provide fields needed to compute new filter subsets efficiently.
- Ensure expiring-soon and lane-shape flags are derivable from data.

### 13.4 Phase 5 Scope (Frontend)

#### A) Filter UX
- Remove horizontal stats filters.
- Add new left filters:
  - per unit transport
  - per weight
  - per load any size
  - expiring soon
  - direct trip
  - simple lane
- Keep required existing filters and remove My Folders.

#### B) Calculator UX
- Pickup dropdown sourced from lane origins.
- Dropoff options dependent on selected pickup.
- Quote logic based on pallets, weight, vehicle type and available lane rows.

### 13.5 Shared FE/BE Alignment Tasks
- Define filter semantics for mixed-metric lanes.
- Align calculator fallback behavior when no exact lane metric matches.

### 13.6 Sequence (Execution Order)
1. Finalize filter semantics and data dependencies.
2. Implement left filter set updates and remove deprecated controls.
3. Complete calculator dependent dropdown logic.
4. Validate quote outputs across representative scenarios.

### 13.7 Deliverables
- Final filter panel and behavior.
- Updated quote calculator dependency chain and outputs.

### 13.8 Risks and Mitigations
- Risk: ambiguous metric precedence in quote selection.
  - Mitigation: define deterministic rule order and expose it in docs.

### 13.9 Definition of Done (Phase 5)
- Filter results and counts are accurate and stable.
- Calculator dependencies and quote outputs match business expectations.

---

## 14) Detailed Plan - Phase 6 (Import/Export Parity)

### 14.1 Goal
Achieve reliable CSV/Excel import/export parity for the new metric-row schema, including clear user guidance.

### 14.2 Current State Snapshot
- Existing templates and mappers still reflect legacy-oriented assumptions.
- Allowed value reference/index is not yet finalized for end users.

### 14.3 Phase 6 Scope (Backend)

#### A) Import Validation
- Validate metric type/value combinations.
- Validate route, dates, and scope fields against lane rules.
- Return row-level errors with clear reason codes/messages.

#### B) Export Mapping
- Export in schema compatible with import template.
- Ensure normalized representation for multi-row pricing metrics per lane.

### 14.4 Phase 6 Scope (Frontend)

#### A) Import UX
- Surface template download and accepted values reference.
- Surface row-level import errors clearly.

#### B) Export UX
- Keep one-click export with import-compatible formatting.

### 14.5 Shared FE/BE Alignment Tasks
- Freeze column schema and enum value index.
- Define round-trip examples (export -> import without loss).

### 14.6 Sequence (Execution Order)
1. Finalize template column dictionary and accepted value index.
2. Implement/adjust backend import parser + validators.
3. Implement/adjust export mapper.
4. Validate round-trip scenarios.

### 14.7 Deliverables
- Updated import template and reference guide.
- Import parser/validator updates.
- Export mapper parity updates.

### 14.8 Risks and Mitigations
- Risk: user confusion with multi-row metric representation.
  - Mitigation: provide example rows and strict error hints.

### 14.9 Definition of Done (Phase 6)
- Import accepts valid metric-row files and rejects invalid rows with clear feedback.
- Export format is fully compatible with import template round-trip.

---

## 15) Detailed Plan - Phase 7 (QA, Regression, and Release Readiness)

### 15.1 Goal
Validate full PDS-935 behavior with evidence-based QA and release confidence across frontend and backend.

### 15.2 Current State Snapshot
- Phase 1 completed and Phase 2/3 partially delivered.
- Full regression matrix and release checklist are pending final execution.

### 15.3 Phase 7 Scope (Backend)

#### A) Reliability and Guardrails
- Run endpoint-level regression for create/edit/list/update/status transitions.
- Validate conflict/validation error consistency.

#### B) Diagnostics
- Review logs for validation exceptions and unexpected failures during QA.

### 15.4 Phase 7 Scope (Frontend)

#### A) Functional QA
- Validate add/edit/duplicate/archive/activate/deactivate flows.
- Validate filters, expanded row, and calculator behavior.

#### B) Localization QA
- Validate EN/EL rendering paths for all newly added keys and dynamic labels.
- Ensure no raw i18n keys appear in runtime UI.

### 15.5 Shared FE/BE Alignment Tasks
- Execute acceptance criteria matrix from section 6.
- Validate edge-case matrix:
  - multistop + roundtrip
  - expiring soon boundary
  - overlap conflicts near date edges

### 15.6 Sequence (Execution Order)
1. Execute functional smoke across all flows.
2. Execute validation and conflict-rule negative tests.
3. Execute localization and regression passes.
4. Resolve blockers and rerun verification.
5. Sign off release checklist.

### 15.7 Deliverables
- QA report with evidence per acceptance criterion.
- Regression results and issue triage notes.
- Release readiness sign-off checklist.

### 15.8 Risks and Mitigations
- Risk: hidden regressions from mixed legacy/new paths.
  - Mitigation: targeted regression around adapters and saved lane rendering.

### 15.9 Definition of Done (Phase 7)
- All acceptance criteria are validated with evidence.
- No blocking defects remain for go-live.
- Release checklist approved by engineering/product stakeholders.
