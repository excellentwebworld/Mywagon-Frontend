/**
 * Create Shipment intake — client mirror of CONTRACT.md (v0.2 DRAFT, 16 Oct 2026).
 *
 * Hand-mirrored from the gateway's `src/shipmentIntake/contract.ts` (CONTRACT.md §12 + §5.2 + §8 + §6).
 * Any change to the contract page is a change here; nothing in this folder may invent a field.
 *
 * Two shapes are isolated on purpose, because the Architect expects to revise them:
 *   - `LocalisableText` / `HistoryItem`  (history answers: `{key, params, fallbackText}`, C4)
 *   - `IntakeAnswerWire` + the `stepId`/`rev` envelope (C11)
 * Everything that touches them goes through `intakeCopy.ts` (text) and `intakeService.ts` (envelope).
 */

export type StepKind =
  | 'gate' | 'upload_offer' | 'pick_orders' | 'order_split' | 'describe' | 'location' | 'cargo' | 'window'
  | 'more_pickups' | 'order_number' | 'vehicle' | 'channel' | 'tracking' | 'negotiable' | 'price' | 'order_value'
  | 'summary' | 'done' | 'confirm_discard';

export type NoticeCode =
  | 'place_not_found' | 'partner_not_found' | 'vehicle_unmatched' | 'order_not_found'
  | 'weight_unit_unrecognised' | 'weight_check' | 'weight_pending_unit' | 'unit_unrecognised'
  | 'site_role_mismatch' | 'public_proposed' | 'past_date' | 'same_site' | 'weight_mismatch' | 'time_order'
  | 'express_needs' | 'server_warning' | 'per_order_drafts';

export type QtyUnit = 'EUR Pallets' | 'US Pallets' | 'Boxes' | 'Units' | 'Big Bags';
export type WeightUnit = 'Kgs' | 'Tonnes';

/** §8.2 — text rendered NOW in the shipper's locale; `key` lets the client re-localise. */
export interface Txt { key: string; params?: Record<string, string | number>; text: string }
/** §8.2 / C4 — a stored snapshot that must survive a language switch. `fallbackText` is always present. */
export interface LocalisableText { key: string; params?: Record<string, string | number>; fallbackText: string }

export interface Notice { code: NoticeCode; tone: 'info' | 'warning'; text: Txt; fix?: Txt }

export interface OptionItem {
  id: string; title: string; subtitle?: string; badges?: string[]; disabled?: boolean;
  reason?: 'exact' | 'code' | 'city' | 'name' | 'address' | 'company'; distanceKm?: number; kind?: 'sku' | 'type';
}

export interface MissingItem { field: string; step: StepKind; stopKey?: string; label: Txt }

/* ── Widget specs (§8.3). Only the four this slice renders are typed precisely. ── */
export interface ChoiceOption<Id extends string> { id: Id; label: Txt }
export interface GateWidgetSpec { kind: 'gate'; options: ChoiceOption<'orders' | 'manual'>[] }
export interface UploadOfferWidgetSpec { kind: 'upload_offer'; options: ChoiceOption<'upload' | 'continue'>[] }
export interface DescribeWidgetSpec { kind: 'describe'; example: Txt; stepByStep: Txt }
/** MS3-404: two or more orders picked — one combined load, or one load per order. */
export interface OrderSplitWidgetSpec { kind: 'order_split'; options: ChoiceOption<'combined' | 'per_order'>[]; count?: number }
/** MS3-405: the manual path's optional order number. `exists` = that number is already an order (link to it, or type another). */
export interface OrderNumberWidgetSpec {
  kind: 'order_number';
  value?: string | null;
  placeholder?: Txt; save?: Txt; skip?: Txt;
  exists?: { number: string; orderId: string; text: Txt; link: Txt; other: Txt };
  maxLength?: number;
}
export interface ConfirmDiscardWidgetSpec {
  kind: 'confirm_discard'; reason: 'discard_request' | 'new_load'; hasPending: boolean; yes: Txt; no: Txt;
}
/* ── WP3c: the terms steps (§8.3 table). Fields the contract does not mark as always present are optional here, so a
 *    gateway that omits one degrades to the text step instead of crashing the card. ── */
export interface TrackingWidgetSpec {
  kind: 'tracking';
  /** What "yes" means for the driver and the carrier (`tracking.hint`). */
  consequence?: Txt;
  /** The pre-selected answer (§8.8: the shipper's last answer, else ON). */
  default?: boolean;
  /** Customers on the load, with the e-mails they would be told on. NOT rendered in this slice — open question Q-tracking. */
  customers?: { id: string; name: string; emails: string[] }[];
}
export interface NegotiableWidgetSpec { kind: 'negotiable' }
export interface PriceWidgetSpec {
  kind: 'price';
  suggested?: { value: number; source: 'lane' | 'contract' | 'ai'; label?: Txt };
  currency?: 'EUR';
  /** False when the price is non-negotiable: "Decide later" is refused (§5.1). */
  canSkip?: boolean;
  maxIntDigits?: number;
  decimals?: number;
}
export interface OrderValueWidgetSpec { kind: 'order_value'; autoSum?: number; canSkip?: boolean }
export interface ChannelWidgetSpec {
  kind: 'channel';
  /** `items` is sent inline only when `count ≤ 50` (§19.5); absent above that, and "choose partners" is then hidden until R4 `partners`. */
  partners: { count: number; items?: { id: string; name: string }[] };
  /** `why` is a plain string already in the shipper's language (§19.5). A `Txt` is still accepted, for forward compatibility. */
  suggested?: { partnerId: string; name: string; why?: string | Txt };
  publicWarning?: Txt;
  publicQuota?: { used: number; limit: number };
  proposal?: 'public';
  /** §20.15: pre-selection only, never an answer. `null` (no partners) = nothing pre-selected; anything else is read as null. */
  defaultChoice?: 'private_all' | null;
}
/** §19.4 — exactly these four, upper-case. Anything else is read as "no fit information". */
export type VehicleFit = 'FITS' | 'TIGHT' | 'OVERSIZED' | 'TOO_SMALL';
export interface VehicleChoice {
  typeId: string; label: string; categories: { id: string; label: string }[];
  /** §20.14: emitted per alternative, but OMITTED when the load has no weight (capacity 0 / 0) — no badge when absent. */
  fit?: VehicleFit; utilizationPct?: number;
}
export interface VehicleWidgetSpec {
  kind: 'vehicle';
  /** `categoryIds` is always `[]` for a recommendation (§19.2); the widget does not send it. */
  recommended?: {
    typeId: string; label: string; categoryIds: string[]; fit?: VehicleFit; utilizationPct?: number; rationale?: Txt;
    /** The TRUCK's class limits (§19.3). Optional, and not rendered until the gateway sends it. */
    truckCapacity?: { maxWeightKg: number; maxPallets: number };
  };
  alternatives: VehicleChoice[];
  /** The LOAD's weight and EUR-pallet count, NOT the truck's capacity (§19.3 — the name is frozen). */
  capacity?: { weightKg: number; pallets: number };
  /** Present with no `recommended` ⇒ no truck class holds the load (`vehicle.tooBig`, §19.4). */
  warning?: Txt;
}

/* ── WP3b: the list steps (§8.3 table + R4 §6.6). The contract fixes WHAT the server provides, not every field name:
 *    where it is silent a field is optional here and the gap is listed in the report (Q-* questions). ── */

/** §6.6 — the kinds R4 serves. */
export type OptionsKind = 'locations' | 'products' | 'orders' | 'partners' | 'vehicles';
export type Directory = 'my_locations' | 'customers';

/** §6.6 `groups[]`. `collapsed` is always true: the client opens a group only when the shipper does (MS3-396). */
export interface OptionGroup {
  id: string; label: string; count: number; collapsed?: boolean; options: OptionItem[]; children?: OptionGroup[];
}
export interface OptionsOk {
  ok: true; kind: OptionsKind;
  /** The TRUE count of the whole list (MS3-394), not what has been loaded so far. */
  total: number; nextCursor: string | null; defaultTab: Directory | null;
  groups: OptionGroup[]; flat?: OptionItem[];
  noExactMatch?: boolean; city?: string | null;
  /** §20.7: the true number of groups, when the list is grouped. */
  totalGroups?: number;
  /** §20 note: the gateway's own walk of the catalogue was cut short — `total` may undercount. */
  truncated?: boolean;
  match?: { kind: 'unique' | 'ambiguous' | 'none'; skus: OptionItem[]; types: OptionItem[] };
}
export type OptionsResponse = OptionsOk | RestFail;
/** §6.6 query string. Nothing else is sent. */
export interface OptionsQuery {
  q?: string; group?: string; cursor?: string; limit?: number; role?: 'pickup' | 'dropoff'; directory?: Directory; stopKey?: string;
}

export interface LocationWidgetSpec {
  kind: 'location';
  role: 'pickup' | 'dropoff';
  query?: string | null; city?: string | null;
  /** A top-8 PREVIEW, best first (§20.9) — flat, no company or directory, so never grouped. The full grouped list is R4 `locations`. */
  candidates: OptionItem[];
  /** Matches before the cut at 8 (§20.9). Absent on a gateway that does not send it: "8 of N" is then not shown. */
  totalCandidates?: number;
  defaultTab?: Directory | null;
  noExactMatch?: boolean;
  canCreate?: boolean;
}

/** §20.4 — the fields a `cargo.lines[]` entry carries on the wire. There is NO `wUnit` (the weight is always kg) and the line's words
 *  are `productQuery`, its match `productMatch`. Everything is optional: a line is read defensively. */
export type PlausibilityKind = 'low' | 'high' | 'odd';
export interface LinePlausibility {
  kind: PlausibilityKind;
  /** `low`/`high`: the per-pallet figure; `odd`: null. Null-safe. */
  kgPerUnit: number | null;
  /** Null = warn only, NO chip (§20.4). */
  suggestKg: number | null;
}
export type WeightMode = 'derived' | 'ask' | 'pending_unit';
export interface CargoLineSpec {
  key?: string;
  /** The product (SKU or the shipper's own type row) already resolved for this line. */
  productId?: string | number | null;
  productLabel?: string | null;
  /** The words the shipper used for it. */
  productQuery?: string | null;
  productMatch?: { kind: 'unique' | 'ambiguous' | 'none'; skus: OptionItem[]; types: OptionItem[] } | null;
  qty?: number | null; unit?: QtyUnit | null;
  /** The unit the shipper said is not one of `unitOptions` (§20.4): the unit stays unselected until they choose. */
  unitPending?: boolean;
  /** Kilograms, always. */
  weight?: number | null;
  weightSource?: 'user' | 'product' | 'order' | null;
  /** Authoritative per line (§20.4). */
  weightMode?: WeightMode;
  /** A weight said without a unit (U3): shown as "Is {value} in kilograms or tonnes?". */
  pendingWeight?: { value: number } | null;
  plausibility?: LinePlausibility;
}
export interface CargoWidgetSpec {
  kind: 'cargo';
  stopKey?: string;
  lines: CargoLineSpec[];
  unitOptions?: QtyUnit[];
  /** Describe the FIRST line only (§20.4); each line's own `weightMode` / `weight` win. */
  weightMode?: WeightMode;
  derivedKg?: number;
  /** Typed for completeness; the weight line is built from `weight` (kg) so the text is the same in both languages. */
  derivedText?: string | Txt;
  canCreate?: boolean;
}

export interface WindowPreset { from: string; to: string }
export interface WindowWidgetSpec {
  kind: 'window';
  role: 'pickup' | 'dropoff';
  date?: string | null; timeFrom?: string | null; timeTo?: string | null;
  presets?: WindowPreset[];
  /** `YYYY-MM-DD`, today; may be null (§20.8). A past date is accepted with a warning (§5.1). */
  minDate?: string | null;
  /** MS3-408: "Any time" is an answer. `anyTimeNeedsDate` false (a drop-off) = the day may stay open too. */
  anyTime?: boolean; anyTimeLabel?: Txt; anyTimeHint?: Txt; anyTimeNeedsDate?: boolean;
  // presets are 24-hour HH:MM in the shipper's timezone (§20.8)
}
export interface MorePickupsWidgetSpec { kind: 'more_pickups'; choices?: { id: 'same_location' | 'another_location' | 'no'; label?: Txt }[] }
export interface PickOrdersWidgetSpec {
  kind: 'pick_orders'; search?: boolean; multiple?: boolean;
  /** The first page of orders, R4 shape (§8.3). Absent while the shipper's import is still running (WP3a-pkg2). */
  orders?: OptionsOk;
}

/**
 * A widget kind this build does not know (a newer gateway). Typed loosely: the host shows the step's `prompt` + `fallbackText`.
 * (`kind` is a placeholder literal, not the open string: every `StepKind` that has a widget now has its own spec above, and an
 * open `kind: string` here would swallow the discriminated union's narrowing.)
 */
export interface PendingWidgetSpec {
  kind: 'unknown';
  [field: string]: unknown;
}
export type WidgetSpec =
  | GateWidgetSpec | UploadOfferWidgetSpec | DescribeWidgetSpec | ConfirmDiscardWidgetSpec | OrderSplitWidgetSpec | OrderNumberWidgetSpec
  | TrackingWidgetSpec | NegotiableWidgetSpec | PriceWidgetSpec | OrderValueWidgetSpec | ChannelWidgetSpec | VehicleWidgetSpec
  | LocationWidgetSpec | CargoWidgetSpec | WindowWidgetSpec | MorePickupsWidgetSpec | PickOrdersWidgetSpec
  | PendingWidgetSpec;

/* ── Events (§8.3, §8.5, §8.11–8.13) ── */
export interface IntakeStepEvent {
  v: 1; type: 'step';
  intakeId: string; stepId: string; rev: number;
  step: Exclude<StepKind, 'summary' | 'done'>;
  stopKey?: string; stopRole?: 'pickup' | 'dropoff'; stopIndex?: number;
  editing: boolean;
  prompt: Txt; hint?: Txt;
  notices: Notice[];
  known: { label: Txt; value: string }[];
  remaining: number | null;
  canExpress: boolean; canToSummary: boolean;
  fallbackText: string;
  widget: WidgetSpec;
}

export interface SummaryRow {
  id: string;
  kind: 'stop' | 'cargo' | 'truck' | 'channel' | 'tracking' | 'price' | 'order_value' | 'reference';
  label: Txt; value: string; secondary?: string;
  edit: { step: StepKind; stopKey?: string };
  source?: 'you_said' | 'order' | 'default';
  warning?: Notice;
}

export interface IntakeSummaryEvent {
  v: 1; type: 'summary';
  intakeId: string; stepId: string; rev: number;
  finishRunId: string;
  title: Txt;
  rows: SummaryRow[];
  warnings: Notice[];
  gate: { draftOk: boolean; publishOk: boolean; missing: MissingItem[]; reason: string | null };
  primary: 'save_draft';
  actions: { saveDraft: { enabled: boolean }; publish: { enabled: boolean; disabledReason?: Txt }; copies?: { max: number } };
  wantedFinish: 'draft' | 'publish' | null;
  routeNeeded: boolean;
  /**
   * NOT IN THE CONTRACT (open question Q-route, 16 Oct): §8.5 says the browser measures the route when `routeNeeded`,
   * but the summary event carries no stop coordinates. The existing chat flow gets them from the confirmation card
   * (`location_lat` / `location_lng` per stop). This optional field is where the FE will read them if the Architect
   * adds them; until then `canMeasureRouteFor` is false and Publish stays off with its visible reason.
   */
  route?: { points: ({ lat: number; lng: number; label?: string } | null)[] };
  fallbackText: string;
}

export interface IntakeDoneEvent {
  v: 1; type: 'done';
  intakeId: string; rev: number;
  outcome: 'draft' | 'published' | 'unknown';
  draftId: number; autoId: string | null;
  url: string | null;
  channel?: 'private' | 'public'; status?: string;
  message: Txt;
  warnings: Notice[]; unsupported: string[];
  runId: string; idempotentReplay?: boolean;
  /** MS3-404 "one load per order": every draft written, each with its own link (absent for one load). Undo removes them all. */
  drafts?: { draftId: number; autoId: string | null; url: string | null; orderRef: string | null; label: Txt }[];
  undo: { available: boolean; kind: 'discard_draft' | 'none'; label?: Txt; unavailableReason?: Txt };
  next: { openUrl: Txt; newLoad: Txt };
}

export type IntakeErrorCode =
  | 'ai_paused' | 'unavailable' | 'invalid_facts' | 'invalid_answer' | 'conflict' | 'already_done'
  | 'cancelled' | 'rate_limited' | 'upstream' | 'undo_failed';

export interface IntakeErrorEvent {
  v: 1; type: 'error';
  intakeId: string | null;
  code: IntakeErrorCode;
  message: Txt;
  fix: Txt | null;
  retryable: boolean;
  event?: IntakeEvent;
}

export interface IntakeDiscardedEvent {
  v: 1; type: 'discarded';
  intakeId: string; rev: number;
  reason: 'discard_request' | 'new_load';
  message: Txt;
  pendingApplied: boolean;
  newIntakeId: string | null;
}

export type IntakeEvent =
  | IntakeStepEvent | IntakeSummaryEvent | IntakeDoneEvent | IntakeErrorEvent | IntakeDiscardedEvent;

/** The SSE frame names (§8.1) → the `type` they carry. */
export const INTAKE_SSE_EVENTS = {
  intake_step: 'step',
  intake_summary: 'summary',
  intake_done: 'done',
  intake_error: 'error',
  intake_discarded: 'discarded',
} as const;
export type IntakeSseName = keyof typeof INTAKE_SSE_EVENTS;

/* ── History (§4) ── */
export interface HistoryItem { step: StepKind; stopKey?: string; answer: LocalisableText; at: string; rev: number }

/* ── Answers (§5.2) ── */
export type IntakeAnswerWire =
  | { step: 'gate'; origin: 'orders' | 'manual' }
  | { step: 'upload_offer'; choice: 'upload' | 'continue' }
  | { step: 'pick_orders'; orderIds: string[] }
  | { step: 'order_split'; mode: 'combined' | 'per_order' }
  | { step: 'describe'; choice: 'step_by_step' }
  | { step: 'location'; stopKey: string; locationId: number }
  | { step: 'cargo'; stopKey: string; lines: { key?: string; productId: number; qty: number; unit: QtyUnit; weight?: number; wUnit?: WeightUnit }[] }
  | { step: 'cargo_order'; stopKey: string; orderId: string }
  | { step: 'window'; stopKey: string; date: string; timeFrom: string | null; dateTo?: string | null; timeTo?: string | null; anyTime?: boolean }
  | { step: 'more_pickups'; choice: 'same_location' | 'another_location' | 'no' }
  | { step: 'order_number'; orderNumber: string | null; link?: boolean }
  | { step: 'vehicle'; typeIds: string[]; categoryIds: string[] }
  | { step: 'channel'; channel: 'private' | 'public'; partnerIds: string[]; allPartners?: boolean }
  | { step: 'tracking'; tracking: boolean; emails?: Record<string, string[]> }
  | { step: 'negotiable'; negotiable: boolean }
  | { step: 'price'; price: number | null }
  | { step: 'order_value'; orderValue: number | null }
  | { step: 'edit'; target: StepKind; stopKey?: string }
  | { step: 'edit_cancel' }
  | { step: 'express'; mode: 'defaults' }
  | { step: 'to_summary' }
  | { step: 'confirm_discard'; confirm: boolean };

/** §6.2 — every answer carries both. */
export interface AnswerRequest { stepId: string; rev: number; answer: IntakeAnswerWire }

/* ── REST envelopes (§6). Business outcomes are HTTP 200 (§6.1). ── */
export interface RestFail {
  ok: false;
  code: string;                       // invalid_answer · conflict · already_done · cancelled · unavailable · blocked · finish_in_progress · undo_failed …
  reason?: string;
  field?: string;
  message?: string; fix?: string;     // convenience copy of error.message.text / error.fix.text
  currentRev?: number;                // conflict
  event?: IntakeEvent;                // the current state the UI should render
  error?: IntakeErrorEvent;           // byte-identical to the SSE frame
  missing?: MissingItem[];            // blocked
  warnings?: string[];
}
export interface StartOk { ok: true; intakeId: string; rev: number; event: IntakeEvent; history: HistoryItem[] }
export interface GetOk { ok: true; intakeId?: string; rev?: number; event: IntakeEvent; history: HistoryItem[] }
/** R1b (MS3-407): the chat's unfinished load, read only — `intakeId: null` when there is none. */
export type OpenResponse = { ok: true; intakeId: null } | (StartOk & { status?: string });
/** R1c (MS3-407): the shipper's newest unfinished load from any chat, offered on the welcome screen. */
export type UnfinishedResponse = { ok: true; intakeId: null } | { ok: true; intakeId: string; conversationId: string; route: string | null };
export interface AnswerOk { ok: true; rev: number; replay?: boolean; event: IntakeEvent; followUp?: IntakeEvent }
export interface FinishOk { ok: true; event: IntakeDoneEvent }
export interface UndoOk { ok: true; event: IntakeEvent }

export type StartResponse = StartOk | RestFail;
export type GetResponse = GetOk | RestFail;
export type AnswerResponse = AnswerOk | RestFail;
export type FinishResponse = FinishOk | RestFail;
export type UndoResponse = UndoOk | RestFail;
export type DiscardResponse = AnswerOk | RestFail;

export interface RouteSummary { total_dist_km: number; total_drive_min?: number }
export interface FinishRequest {
  intent: 'save_draft' | 'publish'; runId: string; rev: number; routeSummary?: RouteSummary; copies?: number;
}
