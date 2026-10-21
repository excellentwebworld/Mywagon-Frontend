/**
 * DEV-ONLY preview of the intake widgets with no gateway: `localhost:5173/vagonai?intakePreview=<scenario>`.
 *
 * Lets QA see every widget without a login or a write. The page loads this module with a dynamic `import()` behind
 * `import.meta.env.DEV`, so it is not part of a production bundle. The events are the fixtures, which follow the gateway's
 * real shapes (see `fixtures/intakeFixtures.ts`); the scripted `api` answers like CONTRACT.md §6 would — it is NOT the
 * contract's source of truth and invents no route.
 *
 *   gate · describe · upload · text · express · editing · discard · summary · summary-missing · summary-route ·
 *   summary-blocked · done · done-published · history
 *   NEW in pkg 1: summary-route-ok (summary-route is unchanged: Publish stays off with its reason)
 *   NEW in pkg 2: pick-orders (QA-1: no longer a bare title — it asks R4 `orders` itself and shows loading → "No orders found")
 *   NEW in QA-1:  pick-orders-loading · pick-orders-empty · pick-orders-error   (every earlier name is unchanged)
 *   NEW in pkg 3: vehicle · vehicle-none · vehicle-small · channel · channel-suggested · channel-nopartners · tracking · tracking-off ·
 *                 negotiable · price · price-fixed · order-value
 *   NEW in WP3b:  location-pickup · location-dropoff · location-noexact · cargo-tree · cargo-ask · cargo-pending-unit · cargo-ambiguous · cargo-none ·
 *                 window · window-dropoff · more-pickups · pick-orders-list · partners-pick · vehicle-tight · vehicle-toobig
 *   NEW in WP3b r2 (§20): location-bestof · cargo-plaus-low · cargo-plaus-high · cargo-plaus-odd · cargo-plaus-nochip · cargo-two-lines ·
 *                 cargo-disabled-type · channel-nopreselect · vehicle-nofit · window-nomin   (every earlier name is unchanged)
 *                 (the stop steps chain: location → cargo → window → more-pickups → drop-off → window → truck …; the R4 lists are
 *                 hand-written fixtures; "+ Add new" is off here because it would write to the real account)
 */
import type { ThreadMessage } from '../threadCards';
import type {
  AnswerRequest, AnswerResponse, FinishRequest, FinishResponse, IntakeEvent, StartResponse, UndoResponse,
} from './contract';
import type { IntakeApi } from './intakeService';
import * as fx from './fixtures/intakeFixtures';
import * as ox from './fixtures/optionsFixtures';
import { seedFromStart } from './intakeThread';

const PAUSE_MS = 350;
const wait = () => new Promise<void>((resolve) => { setTimeout(resolve, PAUSE_MS); });

const asThread = (events: IntakeEvent[]): ThreadMessage[] => events.map((event) => ({ who: 'ai' as const, text: '', intake: { kind: 'event' as const, event } }));

/** What the scripted gateway shows after each kind of answer. */
function nextEvent(req: AnswerRequest): IntakeEvent {
  const rev = req.rev + 1;
  switch (req.answer.step) {
    case 'gate': return req.answer.origin === 'orders' ? fx.pickOrdersStep(rev) : fx.uploadOfferStep(rev);
    case 'upload_offer': return req.answer.choice === 'upload' ? fx.pickOrdersStep(rev) : fx.describeStep(rev);
    case 'describe': return ox.locationWidgetStep({}, rev);
    // WP3b: the stop steps, in the order of §9.1: pickup site → cargo → window → more pickups → drop-off site → window → truck.
    case 'location': return req.answer.stopKey === 's1' ? ox.cargoStep({}, rev) : ox.windowStep({ role: 'dropoff' }, rev);
    case 'cargo': return ox.windowStep({}, rev);
    case 'window': return req.answer.stopKey === 's1' ? ox.morePickupsStep(rev) : fx.vehicleStep({}, rev);
    case 'more_pickups': return req.answer.choice === 'no' ? ox.locationWidgetStep({ role: 'dropoff' }, rev) : ox.locationWidgetStep({}, rev);
    // WP3c: the terms run in the order of §9.1 so QA can walk truck → channel → tracking → negotiable → price → order value → summary.
    case 'vehicle': return fx.channelStep({ items: true }, rev);
    case 'channel': return fx.trackingStep(true, rev);
    case 'tracking': return fx.negotiableStep(rev);
    case 'negotiable': return req.answer.negotiable ? fx.priceStep({}, rev) : fx.priceStep({ canSkip: false }, rev);
    case 'price': return fx.orderValueStep(1280.5, rev);
    case 'edit': return { ...fx.editingStep(), stepId: `int_9f1c:${rev}`, rev };
    case 'edit_cancel':
    case 'express':
    case 'to_summary': return { ...fx.summaryMissingPrice(), stepId: `int_9f1c:${rev}`, rev };
    case 'confirm_discard': return req.answer.confirm ? fx.discarded() : { ...fx.summaryMissingPrice(), stepId: `int_9f1c:${rev}`, rev };
    default: return { ...fx.summaryMissingPrice(), stepId: `int_9f1c:${rev}`, rev };
  }
}

export const previewApi: IntakeApi = {
  async start(): Promise<StartResponse> { await wait(); return { ok: true, intakeId: 'int_9f1c', rev: 0, event: fx.gateStep('en', 0), history: [] }; },
  async get() { await wait(); return { ok: true as const, event: fx.gateStep('en', 0), history: fx.history() }; },
  async answer(_id: string, body: AnswerRequest): Promise<AnswerResponse> {
    await wait();
    const event = nextEvent(body);
    return { ok: true, rev: 'rev' in event ? event.rev : body.rev + 1, event };
  },
  async finish(_id: string, body: FinishRequest): Promise<FinishResponse> {
    await wait();
    return { ok: true, event: body.intent === 'publish' ? fx.donePublished() : fx.doneDraft() };
  },
  async undo(): Promise<UndoResponse> { await wait(); return { ok: true, event: { ...fx.summaryComplete(), stepId: 'int_9f1c:16', rev: 16, finishRunId: 'run_9f1c_16_1' } }; },
  options: async (id, kind, query) => {
    // QA-1: the orders step has no first page on its event; the widget asks R4 `orders` itself. The scripted answers:
    // loading ⇒ never resolves, error ⇒ `{ok:false}`, anything else ⇒ an empty list (the shipper has no orders). A page after the
    // first (`cursor`) is the hand-written list of `pick-orders-list`.
    if (kind === 'orders' && !query?.cursor) {
      if (id === fx.PICK_ORDERS_PREVIEW_IDS.loading) return new Promise<never>(() => undefined);
      await wait();
      if (id === fx.PICK_ORDERS_PREVIEW_IDS.error) return { ok: false, code: 'unavailable' };
      return { ok: true, kind: 'orders', groups: [], total: 0, nextCursor: null, defaultTab: null };
    }
    return ox.fakeOptions()(kind, query ?? {});
  },
  async discard() { await wait(); return { ok: true as const, rev: 7, event: fx.discarded() }; },
};

const SCENARIOS: Record<string, () => IntakeEvent[]> = {
  gate: () => [fx.gateStep()],
  describe: () => [fx.describeStep()],
  upload: () => [fx.uploadOfferStep()],
  // NEW (pkg 2): the step the shipper waits on while the import runs (the page's file picker is skipped in preview).
  'pick-orders': () => [fx.pickOrdersStep()],
  'pick-orders-loading': () => [fx.pickOrdersStep(2, 'loading')],
  'pick-orders-empty': () => [fx.pickOrdersStep()],
  'pick-orders-error': () => [fx.pickOrdersStep(2, 'error')],
  // NEW (pkg 3): the terms steps. Each answers into the next one (see `nextEvent`).
  vehicle: () => [fx.vehicleStep()],
  'vehicle-none': () => [fx.vehicleStep({ recommended: false })],
  'vehicle-small': () => [fx.vehicleStep({ fit: 'TOO_SMALL' })],
  // The gateway sends the partner list inline up to 50 partners, so the channel scenarios carry it.
  channel: () => [fx.channelStep({ quota: true, items: true })],
  'channel-suggested': () => [fx.channelStep({ suggested: true, items: true })],
  'channel-nopartners': () => [fx.channelStep({ partners: 0 })],
  tracking: () => [fx.trackingStep(true)],
  'tracking-off': () => [fx.trackingStep(false)],
  negotiable: () => [fx.negotiableStep()],
  price: () => [fx.priceStep()],
  'price-fixed': () => [fx.priceStep({ suggested: null, canSkip: false })],
  'order-value': () => [fx.orderValueStep()],
  // NEW (WP3b): the stop widgets. Each answers into the next (see `nextEvent`).
  'location-pickup': () => [ox.locationWidgetStep()],
  'location-dropoff': () => [ox.locationWidgetStep({ role: 'dropoff' })],
  'location-noexact': () => [ox.locationWidgetStep({ noExact: true })],
  'cargo-tree': () => [ox.cargoStep({ match: 'none', empty: true })],
  'cargo-ask': () => [ox.cargoStep({ weightMode: 'ask' })],
  'cargo-pending-unit': () => [ox.cargoStep({ weightMode: 'pending_unit' })],
  'cargo-ambiguous': () => [ox.cargoStep({ match: 'ambiguous' })],
  'cargo-none': () => [ox.cargoStep({ match: 'none' })],
  'location-bestof': () => [ox.locationWidgetStep({ totalCandidates: 23 })],
  // §20.4 per-line plausibility: low / high with a chip, odd with and without one (null suggestKg ⇒ no chip).
  'cargo-plaus-low': () => [ox.cargoStep({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: 5, suggestKg: 6000 } })],
  'cargo-plaus-high': () => [ox.cargoStep({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'high', kgPerUnit: 9000, suggestKg: 9000 } })],
  'cargo-plaus-odd': () => [ox.cargoStep({ weightMode: 'ask', weight: 0.5, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: 500 } })],
  'cargo-plaus-nochip': () => [ox.cargoStep({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: null } })],
  'cargo-two-lines': () => [ox.cargoStep({ weightMode: 'derived', secondLine: 'ask' })],
  'cargo-disabled-type': () => [ox.cargoStep({ match: 'ambiguous', disabledType: true })],
  'channel-nopreselect': () => [fx.channelStep({ defaultChoice: null })],
  'vehicle-nofit': () => [fx.vehicleStep({ unmeasurable: true })],
  'window-nomin': () => [ox.windowStep({ minDate: null })],
  window: () => [ox.windowStep()],
  'window-dropoff': () => [ox.windowStep({ role: 'dropoff' })],
  'more-pickups': () => [ox.morePickupsStep()],
  'pick-orders-list': () => [ox.pickOrdersListStep()],
  'partners-pick': () => [fx.channelStep({ partners: 12, items: true })],
  'vehicle-tight': () => [fx.vehicleStep({ fit: 'TIGHT' })],
  'vehicle-toobig': () => [fx.vehicleStep({ tooBig: true })],
  text: () => [fx.locationStep()],
  express: () => [fx.expressStep()],
  editing: () => [fx.editingStep()],
  discard: () => [fx.confirmDiscardStep(true)],
  summary: () => [fx.summaryComplete({ wantedFinish: 'publish' })],
  'summary-missing': () => [fx.summaryMissingPrice()],
  'summary-route': () => [fx.summaryComplete({ routeNeeded: true })],
  // NEW (pkg 1): the same summary once the event carries stop positions — Publish measures the route and goes.
  'summary-route-ok': () => [fx.summaryComplete({ routeNeeded: true, withRoute: true })],
  'summary-blocked': () => [fx.summaryDraftBlocked()],
  done: () => [fx.doneDraft()],
  'done-published': () => [fx.donePublished()],
};

/** The scenario named in the URL, as a transcript — or null (no param, unknown name). */
export function devPreview(search: string = window.location.search): { thread: ThreadMessage[]; api: IntakeApi } | null {
  const name = new URLSearchParams(search).get('intakePreview');
  if (!name) return null;
  if (name === 'history') {
    return { thread: seedFromStart([], { event: fx.summaryMissingPrice(), history: fx.history() }, 'int_9f1c'), api: previewApi };
  }
  const make = SCENARIOS[name];
  if (!make) return null;
  return { thread: asThread(make()), api: previewApi };
}
