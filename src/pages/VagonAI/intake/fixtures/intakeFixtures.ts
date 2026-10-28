/**
 * Fixtures for the intake widgets and the DEV preview (`devPreview.ts`).
 *
 * Shaped like what the gateway really sends (re-checked 2026-10-20 against `ChatBot/src/shipmentIntake/events.ts`
 * `buildStepEvent` / `buildSummaryEvent` / `buildDoneEvent` and its copy tables): every step carries `known` chips and a
 * number in `remaining`; the summary rows have the gateway's ids (`stop-0`, `cargo-l1`, …), its value formats and the
 * `negotiable` / `order_value` rows; the widget payloads carry the fields the gateway adds (`options`, `default`, …).
 * The golden folder (`ChatBot/test/fixtures/intake/`) holds scenarios with expectations, not raw events, so there is
 * nothing to copy from it verbatim. Ids, names and numbers are sample data.
 *
 * Fields the gateway sends that this build's contract mirror does not type yet are added with `wire(…)`, so the preview
 * carries the real payload without widening `contract.ts`.
 */
import type {
  HistoryItem, IntakeDiscardedEvent, IntakeDoneEvent, IntakeErrorEvent, IntakeStepEvent, IntakeSummaryEvent, Txt, VehicleFit, WidgetSpec,
} from '../contract';

export const txt = (key: string, text: string, params?: Record<string, string | number>): Txt => ({ key, text, ...(params ? { params } : {}) });

/** A widget spec plus the wire fields its type does not list (see the header). */
export const wire = <W extends WidgetSpec>(spec: W, extra: Record<string, unknown>): W => Object.assign(spec, extra);

/** Before anything is known (the gate): the stops plus the six terms still to ask, minus this question (events.ts `remainingAfter`). */
const base = { v: 1 as const, intakeId: 'int_9f1c', notices: [], known: [], remaining: 6, canExpress: false, canToSummary: false, editing: false };

/** What the shipper has given so far, as the gateway's chips (events.ts `knownChips`: pickup, drop-off, cargo, date — at most four). */
export const KNOWN = [
  { label: txt('known.pickup', 'Pickup'), value: 'Athens Distribution Centre' },
  { label: txt('known.dropoff', 'Drop-off'), value: 'Ioannina Retail Hub' },
  { label: txt('known.cargo', 'Cargo'), value: '10 × Toilet paper 3-ply, 12 rolls' },
  { label: txt('known.date', 'Date'), value: '2026-10-23' },
];

export const gateStep = (locale: 'en' | 'el' = 'en', rev = 0): IntakeStepEvent => ({
  ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'gate',
  prompt: locale === 'el' ? txt('gate.prompt', 'Πώς θέλεις να ξεκινήσεις;') : txt('gate.prompt', 'How do you want to start?'),
  fallbackText: locale === 'el' ? 'Πώς θέλεις να ξεκινήσεις;\n1. Από τις παραγγελίες μου\n2. Χειροκίνητα' : 'How do you want to start?\n1. From my orders\n2. Manually',
  widget: {
    kind: 'gate',
    options: [
      { id: 'orders', label: locale === 'el' ? txt('gate.orders', 'Από τις παραγγελίες μου') : txt('gate.orders', 'From my orders') },
      { id: 'manual', label: locale === 'el' ? txt('gate.manual', 'Χειροκίνητα') : txt('gate.manual', 'Manually') },
    ],
  },
});

const DESCRIBE_PROMPT = "Tell me about the load in your own words: where it's picked up and dropped off, the products and quantities, and when. Anything you skip, I'll ask.";
export const describeStep = (rev = 1): IntakeStepEvent => ({
  ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'describe', remaining: 7,
  prompt: txt('describe.prompt', DESCRIBE_PROMPT),
  hint: txt('describe.example', 'e.g. 10 pallets of toilet paper, Athens to Ioannina, pickup tomorrow 3–5 pm'),
  fallbackText: DESCRIBE_PROMPT,
  widget: {
    kind: 'describe',
    example: txt('describe.example', 'e.g. 10 pallets of toilet paper, Athens to Ioannina, pickup tomorrow 3–5 pm'),
    stepByStep: txt('describe.stepByStep', "I'd rather go step by step"),
  },
});

export const uploadOfferStep = (rev = 1): IntakeStepEvent => ({
  ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'upload_offer',
  prompt: txt('upload.prompt', 'Do you have the orders in a file (Excel or CSV)?'),
  fallbackText: 'Do you have the orders in a file (Excel or CSV)?\n1. Yes, upload the file\n2. No, continue',
  widget: { kind: 'upload_offer', options: [{ id: 'upload', label: txt('upload.yes', 'Yes, upload the file') }, { id: 'continue', label: txt('upload.no', 'No, continue') }] },
});

/** The preview ids that tell the scripted R4 `orders` which answer to give (QA-1): see `devPreview.previewApi.options`. */
export const PICK_ORDERS_PREVIEW_IDS = { loading: 'int_pk_loading', error: 'int_pk_error' } as const;

/**
 * The orders step WITHOUT its first page (the shipper chose "from my orders", or the import is running): prompt + fallbackText.
 * The widget asks R4 `orders` itself. `variant` picks what the scripted preview answers: default ⇒ no orders (empty state),
 * `loading` ⇒ never answers, `error` ⇒ `{ok:false}`.
 */
export const pickOrdersStep = (rev = 2, variant?: 'loading' | 'error'): IntakeStepEvent => ({
  ...base, ...(variant ? { intakeId: PICK_ORDERS_PREVIEW_IDS[variant] } : {}), type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'pick_orders',
  prompt: txt('orders.prompt', 'Which orders go on this load?'),
  fallbackText: 'Which orders go on this load?',
  widget: { kind: 'pick_orders', search: true, multiple: true },
});

/* ── WP3c: the terms steps, written from the §8.3 table and the §11.2 copy (not captured from a gateway) ── */
const terms = { canExpress: true, canToSummary: true, known: KNOWN };

export const vehicleStep = (opts: { recommended?: boolean; fit?: string; tooBig?: boolean; altFit?: boolean; unmeasurable?: boolean } = {}, rev = 7): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'vehicle', remaining: 5,
  prompt: txt('vehicle.prompt', 'Which truck?'),
  // The gateway numbers options only for the steps that have `options` (gate, tracking, …): the truck list is not one.
  fallbackText: 'Which truck?',
  widget: {
    kind: 'vehicle',
    ...(opts.recommended === false || opts.tooBig ? {} : {
      recommended: {
        typeId: 't_semi', label: 'Semi-trailer, curtain side', categoryIds: [], ...(opts.unmeasurable ? {} : { fit: (opts.fit ?? 'FITS') as VehicleFit, utilizationPct: 30 }),
        truckCapacity: { maxWeightKg: 24000, maxPallets: 33 },
        // `kg` is a number in the params; the gateway formats it into the text.
        rationale: txt('vehicle.recommended', 'Recommended for 1,200 kg: Semi-trailer, curtain side', { kg: 1200, truck: 'Semi-trailer, curtain side' }),
      },
    }),
    // Every type of the account, the recommended one included, each with its fit — none when the load has no weight (§20.14).
    alternatives: [
      // The same fit as the recommendation: the gateway works both out the same way.
      { typeId: 't_semi', label: 'Semi-trailer, curtain side', categories: [{ id: 'c_curtain', label: 'Curtain side' }, { id: 'c_box', label: 'Box' }], ...(opts.unmeasurable ? {} : { fit: (opts.fit ?? 'FITS') as VehicleFit, utilizationPct: 30 }) },
      { typeId: 't_rigid', label: 'Rigid truck 12 t', categories: [{ id: 'c_box', label: 'Box' }], ...(opts.unmeasurable ? {} : opts.altFit ? { fit: 'TIGHT' as const, utilizationPct: 91 } : { fit: 'FITS' as const, utilizationPct: 71 }) },
      { typeId: 't_van', label: 'Van', categories: [{ id: 'c_van', label: 'Van' }], ...(opts.unmeasurable ? {} : opts.altFit ? { fit: 'TOO_SMALL' as const, utilizationPct: 130 } : { fit: 'FITS' as const, utilizationPct: 80 }) },
    ],
    // The LOAD's weight and pallets (§19.3), not the truck's capacity.
    capacity: opts.unmeasurable ? { weightKg: 0, pallets: 0 } : { weightKg: 1200, pallets: 10 },
    ...(opts.tooBig ? { warning: txt('vehicle.tooBig', 'This load is too heavy for one truck. Split it, or check the weight.') } : {}),
  },
});

/** Twelve partners, the shape of §19.5 `partners.items`. */
export const PARTNERS = [
  'Hellas Freight', 'Aegean Haulage', 'Pindos Transport', 'Thessaly Logistics', 'Epirus Carriers', 'Attica Express',
  'Macedonia Cargo', 'Crete Trucking', 'Ionian Lines', 'Olympus Freight', 'Peloponnese Movers', 'Nafplio Haul',
].map((name, i) => ({ id: i === 0 ? 'p_77' : `p_${100 + i}`, name }));

export const channelStep = (opts: { partners?: number; suggested?: boolean; proposal?: 'public'; quota?: boolean; items?: boolean; defaultChoice?: string | null } = {}, rev = 8): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'channel', remaining: 4,
  prompt: txt('channel.prompt', 'Who should see this load?'),
  fallbackText: 'Who should see this load?',
  widget: wire({
    kind: 'channel',
    // The gateway sends `items` whenever there are 50 partners or fewer. It stays opt-in here because the "choose partners"
    // tests switch it on and off; the preview's channel scenarios pass it.
    partners: {
      count: opts.partners ?? 12,
      ...(opts.items ? { items: PARTNERS.slice(0, opts.partners ?? 12) } : {}),
    },
    // `why` is a plain string already in the shipper's language (§19.5).
    ...(opts.suggested ? { suggested: { partnerId: 'p_77', name: 'Hellas Freight', why: 'Your contract partner on Athens–Ioannina' } } : {}),
    publicWarning: txt('channel.public.warn', 'A public load is visible to every carrier on MYVAGON.'),
    ...(opts.quota ? { publicQuota: { used: 3, limit: 10 } } : {}),
    ...(opts.proposal ? { proposal: opts.proposal } : {}),
    // Always sent: `private_all` with partners, null with none (§20.15).
    defaultChoice: opts.defaultChoice !== undefined ? opts.defaultChoice as 'private_all' | null : (opts.partners ?? 12) > 0 ? 'private_all' : null,
  }, (opts.partners ?? 12) === 0 ? { noPartners: txt('channel.noPartners', 'You have no partners yet. Choose Public, or add a partner first.') } : {}),
});

export const trackingStep = (defaultOn = true, rev = 9): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'tracking', remaining: 3,
  prompt: txt('tracking.prompt', 'Require live navigation (GPS tracking)?'),
  hint: txt('tracking.hint', "The driver has to run the job in the app, so the carrier can't mark it delivered by hand."),
  fallbackText: 'Require live navigation (GPS tracking)?\n1. Yes, track it\n2. No',
  widget: wire({
    kind: 'tracking', default: defaultOn,
    consequence: txt('tracking.hint', "The driver has to run the job in the app, so the carrier can't mark it delivered by hand."),
    // The customers of the order lines; the gateway has no e-mails for them yet.
    customers: [{ id: 'c_1', name: 'Ioannina Retail Hub', emails: [] }],
  }, { options: [{ id: 'yes', label: txt('tracking.yes', 'Yes, track it') }, { id: 'no', label: txt('tracking.no', 'No') }] }),
});

export const negotiableStep = (rev = 10): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'negotiable', remaining: 2,
  prompt: txt('negotiable.prompt', 'Can carriers counter-offer on the price?'),
  fallbackText: 'Can carriers counter-offer on the price?\n1. Yes, negotiable\n2. No, fixed price',
  widget: wire({ kind: 'negotiable' }, {
    default: true,
    options: [{ id: 'yes', label: txt('negotiable.yes', 'Yes, negotiable'), selected: true }, { id: 'no', label: txt('negotiable.no', 'No, fixed price') }],
  }),
});

export const priceStep = (opts: { suggested?: number | null; canSkip?: boolean } = {}, rev = 11): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'price', remaining: 1,
  prompt: txt('price.prompt', 'What price do you offer?'),
  fallbackText: 'What price do you offer?',
  widget: {
    kind: 'price', currency: 'EUR', canSkip: opts.canSkip ?? true, maxIntDigits: 7, decimals: 2,
    // The gateway's one source today is the shipper's own defaults: `source: 'ai'`.
    ...(opts.suggested === null ? {} : { suggested: { value: opts.suggested ?? 640, source: 'ai' as const, label: txt('price.suggested', `Suggested: €${opts.suggested ?? 640}`, { price: opts.suggested ?? 640 }) } }),
  },
});

export const orderValueStep = (autoSum: number | null = 1280.5, rev = 12): IntakeStepEvent => ({
  ...base, ...terms, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'order_value', remaining: 0,
  prompt: txt('orderValue.prompt', 'What is the total order value?'),
  fallbackText: 'What is the total order value?',
  widget: { kind: 'order_value', canSkip: true, ...(autoSum === null ? {} : { autoSum }) },
});

/** The location step as a build WITHOUT the location widget sees it: prompt + fallbackText (kept for the `text`, `express` and `editing` previews). */
export const locationStep = (rev = 3): IntakeStepEvent => ({
  ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'location', stopKey: 's1', stopRole: 'pickup', stopIndex: 0,
  prompt: txt('location.pickup.prompt', 'Where is it picked up?'),
  notices: [{ code: 'place_not_found', tone: 'warning', text: txt('note.place_not_found', 'I couldn\'t find "Athens DC" in your sites.', { query: 'Athens DC' }), fix: txt('note.place_not_found.fix', 'Pick the closest site, or add it.') }],
  canExpress: false, canToSummary: false,
  // Not a gateway location step (that one has its widget, `optionsFixtures`): a kind this build cannot draw, whose fallback
  // text lists the answers — what a newer gateway step degrades to.
  fallbackText: 'Where is it picked up?\n1. Athens Distribution Centre\n2. Athens Warehouse\n3. Add a new site',
  // A kind this build has no widget for (a newer gateway): stays the text step. The real location widget has its own fixtures in `optionsFixtures`.
  widget: { kind: 'unknown', role: 'pickup', candidates: [] },
});

export const editingStep = (): IntakeStepEvent => ({ ...locationStep(9), editing: true, canToSummary: false });
export const expressStep = (): IntakeStepEvent => ({ ...locationStep(5), canExpress: true, canToSummary: true });

/** The gateway sends the two answers as `options`, with no `yes` / `no` fields (`stepViewOf` reads either shape). */
export const confirmDiscardStep = (hasPending = false, rev = 6): IntakeStepEvent => {
  const prompt = hasPending ? txt('cancel.confirmNew', 'Discard the current load and start a new one?') : txt('cancel.confirm', 'Discard this load?');
  const yes = hasPending ? txt('cancel.yesNew', 'Yes, start the new one') : txt('cancel.yes', 'Yes, discard');
  const no = hasPending ? txt('cancel.noKeep', 'No, keep the current one') : txt('cancel.no', 'No, keep going');
  return {
    ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: 'confirm_discard', remaining: 0,
    prompt,
    fallbackText: `${prompt.text}\n1. ${yes.text}\n2. ${no.text}`,
    widget: { kind: 'confirm_discard', reason: hasPending ? 'new_load' : 'discard_request', hasPending, options: [{ id: 'yes', label: yes }, { id: 'no', label: no }] } as unknown as WidgetSpec,
  };
};

/** The gateway writes an unset value into the row itself (events.ts `buildSummaryEvent`). */
const NOT_SET = 'Not set — needed to publish';
const NOT_SET_OPTIONAL = 'Not set (optional)';

/**
 * A manual load, one pickup and one drop-off: the rows `buildSummaryEvent` makes for it, in its order, ids and formats
 * (`stop-<index>`, one `cargo-<lineKey>` row per line after its stop, `negotiable` with kind `price`, `order_value` last).
 * Not mirrored: the `order_number` row (MS3-405) — its edit step is not in this build's `StepKind` yet.
 */
const summaryRows = (price: number | null): IntakeSummaryEvent['rows'] => [
  { id: 'stop-0', kind: 'stop', label: txt('summary.row.pickup', 'Pickup'), value: 'Athens Distribution Centre · 2026-10-23 15:00–17:00', edit: { step: 'location', stopKey: 's1' }, source: 'you_said' },
  { id: 'cargo-l1', kind: 'cargo', label: txt('summary.row.cargo', 'Cargo'), value: '10 × Toilet paper 3-ply, 12 rolls · 1,200 kg', secondary: 'Weight: 1,200 kg (from the product)', edit: { step: 'cargo', stopKey: 's1' } },
  { id: 'stop-1', kind: 'stop', label: txt('summary.row.dropoff', 'Drop-off'), value: 'Ioannina Retail Hub · 2026-10-24 08:00–12:00', edit: { step: 'location', stopKey: 's2' }, source: 'you_said' },
  { id: 'truck', kind: 'truck', label: txt('summary.row.truck', 'Truck'), value: 'Semi-trailer, curtain side', edit: { step: 'vehicle' }, source: 'default' },
  { id: 'channel', kind: 'channel', label: txt('summary.row.channel', 'Send to'), value: 'Private · 12 partners', edit: { step: 'channel' }, source: 'default' },
  { id: 'tracking', kind: 'tracking', label: txt('summary.row.tracking', 'Live navigation'), value: 'Yes', secondary: 'Live navigation is on by default. Tap Edit to change it.', edit: { step: 'tracking' }, source: 'default' },
  { id: 'negotiable', kind: 'price', label: txt('summary.row.negotiable', 'Negotiable'), value: 'Yes', edit: { step: 'negotiable' }, source: 'default' },
  { id: 'price', kind: 'price', label: txt('summary.row.price', 'Price'), value: price === null ? NOT_SET : `€${price}`, edit: { step: 'price' }, ...(price === null ? {} : { source: 'you_said' as const }) },
  { id: 'order_value', kind: 'order_value', label: txt('summary.row.orderValue', 'Order value'), value: NOT_SET_OPTIONAL, edit: { step: 'order_value' } },
];

/** `fallbackText` as the gateway builds it: the title, a "Label: value" line per row, then what Publish still needs. */
const summaryFallback = (rows: IntakeSummaryEvent['rows'], needs?: string): string =>
  ['Check your load', ...rows.map((r) => `${r.label.text}: ${r.value}`), ...(needs ? [`To publish, add: ${needs}`] : [])].join('\n');

const missingPrice = { field: 'pricing.startingPrice', step: 'price' as const, label: txt('missing.price', 'Price') };

const summaryBase: IntakeSummaryEvent = {
  // `finishRunId` is UUID-shaped (a hash of intake, rev and undo count).
  v: 1, type: 'summary', intakeId: 'int_9f1c', stepId: 'int_9f1c:14', rev: 14, finishRunId: '3f6c1b2a-9d4e-4a71-8c05-7e2b9f1d4a60',
  title: txt('summary.title', 'Check your load'),
  rows: summaryRows(null),
  warnings: [],
  // `reason` is the core API's own sentence for the refusal; the missing items carry the links.
  gate: { draftOk: true, publishOk: false, reason: 'A price is needed to publish.', missing: [missingPrice] },
  primary: 'save_draft',
  actions: { saveDraft: { enabled: true }, publish: { enabled: false, disabledReason: txt('summary.publishNeeds', 'To publish, add: Price', { fields: 'Price' }) } },
  // Both sites resolved ⇒ the gateway asks for the route; `route` rides along when every site has GPS (see `summaryComplete`).
  wantedFinish: null, routeNeeded: true,
  fallbackText: summaryFallback(summaryRows(null), 'Price'),
};

/** Both sites' map positions, as `route.points` (events.ts `routeOf`): sent only when every stop has one. */
const ROUTE = { points: [{ lat: 37.9838, lng: 23.7275, label: 'Athens Distribution Centre' }, { lat: 39.665, lng: 20.8537, label: 'Ioannina Retail Hub' }] };

/** Draft saveable, publish blocked on a price. */
export const summaryMissingPrice = (): IntakeSummaryEvent => ({ ...summaryBase, route: ROUTE });

/**
 * Everything present; publish enabled. The route is opt-in because the tests drive it: for this load the gateway itself
 * sends `{ routeNeeded: true, withRoute: true }`.
 */
export const summaryComplete = (opts: { routeNeeded?: boolean; wantedFinish?: 'draft' | 'publish' | null; withRoute?: boolean } = {}): IntakeSummaryEvent => ({
  ...summaryBase,
  rows: summaryRows(640),
  fallbackText: summaryFallback(summaryRows(640)),
  warnings: [{ code: 'weight_check', tone: 'warning', text: txt('cargo.weight.checkLow', 'That is only 0.25 kg per pallet. Did you mean 2,500 kg?', { perUnit: 0.25, suggest: 2500 }) }],
  gate: { draftOk: true, publishOk: true, missing: [], reason: null },
  actions: { saveDraft: { enabled: true }, publish: { enabled: true } },
  wantedFinish: opts.wantedFinish ?? null,
  routeNeeded: opts.routeNeeded ?? false,
  ...(opts.withRoute ? { route: ROUTE } : {}),
});

/** Stops incomplete: even a draft is not possible; the gate says why. */
export const summaryDraftBlocked = (): IntakeSummaryEvent => ({
  ...summaryBase,
  // The pickup site is not resolved, so there is no route to ask for yet.
  routeNeeded: false,
  // The labels are the gateway's `missing.*` copy; a field no step owns is "A detail" on the summary itself.
  gate: { draftOk: false, publishOk: false, reason: 'Add where the load is picked up.', missing: [{ field: 'stops[0].locationId', step: 'location', stopKey: 's1', label: txt('missing.location', 'Site') }, { field: 'stops[0].lines[0].qty', step: 'cargo', stopKey: 's1', label: txt('missing.cargo', 'Cargo') }, { field: 'stops', step: 'summary', label: txt('missing.other', 'A detail') }] },
  actions: { saveDraft: { enabled: false }, publish: { enabled: false, disabledReason: txt('summary.publishNeeds', 'To publish, add: Site, Cargo, A detail', { fields: 'Site, Cargo, A detail' }) } },
});

export const doneDraft = (): IntakeDoneEvent => ({
  v: 1, type: 'done', intakeId: 'int_9f1c', rev: 15, outcome: 'draft', draftId: 4821, autoId: 'SID-4821', url: '/shipments/4821',
  message: txt('done.draft', "Saved as draft SID-4821. You'll find it in Manage Shipments.", { autoId: 'SID-4821' }),
  // `runId` is the summary's `finishRunId`.
  warnings: [], unsupported: [], runId: summaryBase.finishRunId,
  undo: { available: true, kind: 'discard_draft', label: txt('undo.label', 'Undo') },
  next: { openUrl: txt('done.open', 'Open shipment'), newLoad: txt('done.new', 'Create another') },
});

export const donePublished = (): IntakeDoneEvent => ({
  ...doneDraft(), outcome: 'published', channel: 'private', message: txt('done.published', 'Published SID-4821. Carriers can see it now.', { autoId: 'SID-4821' }),
  undo: { available: false, kind: 'none', unavailableReason: txt('undo.published', "A published load can't be undone from the chat. Open Manage Shipments to cancel it.") },
});

export const doneUnknown = (): IntakeDoneEvent => ({
  ...doneDraft(), outcome: 'unknown', draftId: 0, autoId: null, url: null,
  message: txt('done.unknown', "MYVAGON didn't answer in time, so it's not clear whether this load went out. Open Manage Shipments and check before trying again."),
  undo: { available: false, kind: 'none', unavailableReason: txt('undo.notDraft', "This load is no longer a draft, so it can't be undone here.") },
});

export const discarded = (pendingApplied = false): IntakeDiscardedEvent => ({
  v: 1, type: 'discarded', intakeId: 'int_9f1c', rev: 7, reason: pendingApplied ? 'new_load' : 'discard_request',
  message: txt('cancel.done', 'Discarded. Nothing was saved.'), pendingApplied, newIntakeId: pendingApplied ? 'int_2b7e' : null,
});

export const staleError = (event?: IntakeStepEvent): IntakeErrorEvent => ({
  v: 1, type: 'error', intakeId: 'int_9f1c', code: 'conflict', retryable: false,
  message: txt('error.stale', 'That step was already answered. Here is where we are.'), fix: txt('error.stale.fix', 'Continue from here.'),
  ...(event ? { event } : {}),
});

export const undoFailedError = (retryable: boolean): IntakeErrorEvent => ({
  v: 1, type: 'error', intakeId: 'int_9f1c', code: 'undo_failed', retryable,
  message: txt('undo.failed', "I couldn't remove the draft, so it is still in Manage Shipments."),
  fix: txt('undo.failed.fix', 'Try again in a moment. If it keeps failing, delete it from Manage Shipments.'),
});

/**
 * The answers `history[]` restores on reopen, with the keys the gateway stores (state.ts `historyAnswer`). `history.gate.manual`
 * and `history.tracking` come from the gateway's own copy table, not the contract's: this build has no string for them yet,
 * so they show their `fallbackText` (the words in the language they were answered in).
 */
export const history = (): HistoryItem[] => [
  { step: 'gate', answer: { key: 'history.gate.manual', fallbackText: 'Entering it manually' }, at: '2026-10-16T09:30:00Z', rev: 1 },
  { step: 'location', stopKey: 's1', answer: { key: 'history.location', params: { name: 'Athens Distribution Centre' }, fallbackText: 'Site: Athens Distribution Centre' }, at: '2026-10-16T09:31:00Z', rev: 2 },
  { step: 'tracking', answer: { key: 'history.tracking', params: { value: 'Yes' }, fallbackText: 'Live navigation: Yes' }, at: '2026-10-16T09:32:00Z', rev: 3 },
  { step: 'location', stopKey: 's2', answer: { key: 'history.location', params: { name: 'Ioannina Retail Hub' }, fallbackText: 'Site: Ioannina Retail Hub' }, at: '2026-10-16T09:33:00Z', rev: 4 },
];
