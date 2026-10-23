/**
 * Pure rules for the intake host: reading what the gateway sends, and deciding what a widget posts.
 * No React, no network — see `intakeThread.ts` for the transcript rules and `intakeService.ts` for the wire.
 */
import {
  INTAKE_SSE_EVENTS,
  type AnswerRequest, type ChannelWidgetSpec, type CargoWidgetSpec, type Directory, type LocationWidgetSpec, type MorePickupsWidgetSpec, type OptionItem, type PickOrdersWidgetSpec, type WindowWidgetSpec, type GateWidgetSpec, type IntakeAnswerWire, type IntakeEvent, type IntakeStepEvent,
  type IntakeSseName, type LocalisableText, type NegotiableWidgetSpec, type OrderNumberWidgetSpec, type OrderSplitWidgetSpec, type OrderValueWidgetSpec, type PriceWidgetSpec,
  type TrackingWidgetSpec, type Txt, type UploadOfferWidgetSpec, type VehicleFit, type VehicleWidgetSpec, type WidgetSpec,
} from './contract';
import { EN_NUMBERS, parseNumber, type NumberLocale, type NumberParse } from './numberFormat';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isTxt = (v: unknown): v is Txt => isObj(v) && typeof v.key === 'string' && typeof v.text === 'string';
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

const TYPES = new Set<string>(['step', 'summary', 'done', 'error', 'discarded']);

/**
 * Validates an event instead of casting it (the lesson of `asFlowContext` in useChat: an event this build
 * cannot render must be dropped or degraded, never handed to a component that reads fields it does not have).
 *
 * Forward compatibility (§0.3, §8.1): an unknown `type` returns null — the caller ignores it. An unknown
 * STEP / widget kind is still a valid step event; the host renders its `fallbackText`.
 */
export function asIntakeEvent(data: unknown): IntakeEvent | null {
  if (!isObj(data) || data.v !== 1 || typeof data.type !== 'string' || !TYPES.has(data.type)) return null;
  switch (data.type) {
    case 'step': {
      if (!isStr(data.intakeId) || !isStr(data.stepId) || typeof data.rev !== 'number' || !isStr(data.step)) return null;
      if (!isTxt(data.prompt) || !isObj(data.widget) || !isStr(data.widget.kind)) return null;
      return {
        ...(data as unknown as IntakeStepEvent),
        editing: data.editing === true,
        notices: Array.isArray(data.notices) ? data.notices : [],
        known: Array.isArray(data.known) ? data.known : [],
        remaining: typeof data.remaining === 'number' ? data.remaining : null,
        canExpress: data.canExpress === true,
        canToSummary: data.canToSummary === true,
        fallbackText: typeof data.fallbackText === 'string' ? data.fallbackText : '',
      };
    }
    case 'summary': {
      if (!isStr(data.intakeId) || !isStr(data.stepId) || typeof data.rev !== 'number' || !isStr(data.finishRunId)) return null;
      if (!Array.isArray(data.rows) || !isObj(data.gate) || !isObj(data.actions) || !isTxt(data.title)) return null;
      const gate = data.gate as Record<string, unknown>;
      return {
        ...(data as unknown as Extract<IntakeEvent, { type: 'summary' }>),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        gate: {
          draftOk: gate.draftOk === true,
          publishOk: gate.publishOk === true,
          missing: Array.isArray(gate.missing) ? gate.missing : [],
          reason: typeof gate.reason === 'string' ? gate.reason : null,
        },
        wantedFinish: data.wantedFinish === 'draft' || data.wantedFinish === 'publish' ? data.wantedFinish : null,
        routeNeeded: data.routeNeeded === true,
        fallbackText: typeof data.fallbackText === 'string' ? data.fallbackText : '',
      };
    }
    case 'done':
      if (!isStr(data.intakeId) || typeof data.rev !== 'number' || !isTxt(data.message) || !isObj(data.undo)) return null;
      return {
        ...(data as unknown as Extract<IntakeEvent, { type: 'done' }>),
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
        unsupported: Array.isArray(data.unsupported) ? data.unsupported : [],
      };
    case 'error':
      if (!isStr(data.code) || !isTxt(data.message)) return null;
      return {
        ...(data as unknown as Extract<IntakeEvent, { type: 'error' }>),
        intakeId: typeof data.intakeId === 'string' ? data.intakeId : null,
        fix: isTxt(data.fix) ? (data.fix as Extract<IntakeEvent, { type: 'error' }>['fix']) : null,
        retryable: data.retryable === true,
        event: data.event === undefined ? undefined : (asIntakeEvent(data.event) ?? undefined),
      };
    case 'discarded':
      if (!isStr(data.intakeId) || typeof data.rev !== 'number' || !isTxt(data.message)) return null;
      return {
        ...(data as unknown as Extract<IntakeEvent, { type: 'discarded' }>),
        pendingApplied: data.pendingApplied === true,
        newIntakeId: typeof data.newIntakeId === 'string' ? data.newIntakeId : null,
      };
    default:
      return null;
  }
}

/** An SSE frame name from the gateway, or null for any other event (`useChat` ignores unknown frames). */
export const intakeSseName = (event: string): IntakeSseName | null => (
  Object.prototype.hasOwnProperty.call(INTAKE_SSE_EVENTS, event) ? (event as IntakeSseName) : null
);

/** The `intakeId` an event belongs to, if it names one. */
export const intakeIdOf = (event: IntakeEvent): string | null => event.intakeId;

/* ── Which widget a step event gets ── */

export type StepView =
  | { kind: 'gate'; spec: GateWidgetSpec }
  | { kind: 'upload_offer'; spec: UploadOfferWidgetSpec }
  | { kind: 'describe'; spec: Extract<WidgetSpec, { kind: 'describe' }> }
  | { kind: 'confirm_discard'; spec: Extract<WidgetSpec, { kind: 'confirm_discard' }> }
  | { kind: 'tracking'; spec: TrackingWidgetSpec }
  | { kind: 'negotiable'; spec: NegotiableWidgetSpec }
  | { kind: 'price'; spec: PriceWidgetSpec }
  | { kind: 'order_value'; spec: OrderValueWidgetSpec }
  | { kind: 'channel'; spec: ChannelWidgetSpec }
  | { kind: 'vehicle'; spec: VehicleWidgetSpec }
  | { kind: 'location'; spec: LocationWidgetSpec }
  | { kind: 'cargo'; spec: CargoWidgetSpec }
  | { kind: 'window'; spec: WindowWidgetSpec }
  | { kind: 'more_pickups'; spec: MorePickupsWidgetSpec }
  | { kind: 'pick_orders'; spec: PickOrdersWidgetSpec }
  | { kind: 'order_split'; spec: OrderSplitWidgetSpec }
  | { kind: 'order_number'; spec: OrderNumberWidgetSpec }
  /** A step whose widget is owned by a later work package (or a newer gateway): prompt + fallbackText. */
  | { kind: 'text' };

/**
 * Chooses the widget. The widget's own `kind` is authoritative (§8.3: "discriminated by kind = the step"), and a
 * spec that disagrees with the shape this build expects (a gate with no options) degrades to text, not a crash.
 */
export function stepViewOf(event: IntakeStepEvent): StepView {
  const w = event.widget;
  switch (w.kind) {
    case 'gate':
      return Array.isArray((w as GateWidgetSpec).options) && (w as GateWidgetSpec).options.length > 0
        ? { kind: 'gate', spec: w as GateWidgetSpec } : { kind: 'text' };
    case 'upload_offer':
      return Array.isArray((w as UploadOfferWidgetSpec).options) && (w as UploadOfferWidgetSpec).options.length > 0
        ? { kind: 'upload_offer', spec: w as UploadOfferWidgetSpec } : { kind: 'text' };
    case 'order_split': {
      const s = w as OrderSplitWidgetSpec;
      const options = Array.isArray(s.options) ? s.options.filter((o) => isObj(o) && (o.id === 'combined' || o.id === 'per_order') && isTxt(o.label)) : [];
      return options.length === 2 ? { kind: 'order_split', spec: { ...s, options } } : { kind: 'text' };
    }
    case 'order_number': {
      const n = w as OrderNumberWidgetSpec;
      const exists = isObj(n.exists) && isStr(n.exists.orderId) && isTxt(n.exists.text) && isTxt(n.exists.link) && isTxt(n.exists.other) ? n.exists : undefined;
      return { kind: 'order_number', spec: { ...n, exists } };
    }
    case 'describe':
      return isTxt((w as Extract<WidgetSpec, { kind: 'describe' }>).stepByStep)
        ? { kind: 'describe', spec: w as Extract<WidgetSpec, { kind: 'describe' }> } : { kind: 'text' };
    case 'confirm_discard': {
      // The gateway sends the two answers as `options: [{id:'yes',label},{id:'no',label}]` (events.ts `optionsFor`), not as
      // `yes` / `no`: either shape is read, so the real payload gets its buttons instead of the text fallback.
      const c = w as Extract<WidgetSpec, { kind: 'confirm_discard' }>;
      const options = (w as { options?: unknown }).options;
      const option = (id: string): unknown => (Array.isArray(options) ? options.find((o) => isObj(o) && o.id === id)?.label : undefined);
      const yes = isTxt(c.yes) ? c.yes : option('yes');
      const no = isTxt(c.no) ? c.no : option('no');
      return isTxt(yes) && isTxt(no) ? { kind: 'confirm_discard', spec: { ...c, yes, no } } : { kind: 'text' };
    }
    case 'tracking': return { kind: 'tracking', spec: w as TrackingWidgetSpec };
    case 'negotiable': return { kind: 'negotiable', spec: w as NegotiableWidgetSpec };
    case 'price': return { kind: 'price', spec: w as PriceWidgetSpec };
    case 'order_value': return { kind: 'order_value', spec: w as OrderValueWidgetSpec };
    case 'channel': {
      const p = (w as ChannelWidgetSpec).partners;
      return isObj(p) && typeof p.count === 'number' ? { kind: 'channel', spec: w as ChannelWidgetSpec } : { kind: 'text' };
    }
    case 'vehicle': {
      const v = w as VehicleWidgetSpec;
      const rec = v.recommended;
      const recOk = rec === undefined || (isObj(rec) && isStr(rec.typeId) && isStr(rec.label) && Array.isArray(rec.categoryIds));
      const alts = Array.isArray(v.alternatives) ? v.alternatives.filter((a) => isObj(a) && isStr(a.typeId) && isStr(a.label)) : [];
      // Nothing to pick from and nothing to say ⇒ the text step, never an empty card. A `warning` with no
      // recommendation is the "no truck class holds this load" outcome (§19.4): the card says so.
      const warn = isTxt(v.warning) ? v.warning : undefined;
      return recOk && (rec !== undefined || alts.length > 0 || warn !== undefined)
        ? { kind: 'vehicle', spec: { ...v, warning: warn, alternatives: alts.map((a) => ({ ...a, categories: Array.isArray(a.categories) ? a.categories : [], fit: fitOf(a.fit) ?? undefined })) } }
        : { kind: 'text' };
    }
    case 'location': {
      const l = w as LocationWidgetSpec;
      // A stop to answer for, a role, and the list of candidates (possibly empty: the shipper then browses or adds).
      return isStr(event.stopKey) && (l.role === 'pickup' || l.role === 'dropoff') && Array.isArray(l.candidates)
        ? { kind: 'location', spec: { ...l, candidates: l.candidates.filter((c) => isObj(c) && isStr(c.id) && isStr(c.title)) } }
        : { kind: 'text' };
    }
    case 'cargo': {
      const c = w as CargoWidgetSpec;
      // A stop to answer for. No `lines` yet ⇒ the widget starts with one empty line.
      return isStr(event.stopKey) ? { kind: 'cargo', spec: { ...c, lines: Array.isArray(c.lines) ? c.lines.filter(isObj) : [] } } : { kind: 'text' };
    }
    case 'window': {
      const x = w as WindowWidgetSpec;
      return isStr(event.stopKey) && (x.role === 'pickup' || x.role === 'dropoff') ? { kind: 'window', spec: x } : { kind: 'text' };
    }
    case 'more_pickups': return { kind: 'more_pickups', spec: w as MorePickupsWidgetSpec };
    case 'pick_orders': {
      // QA-1: with no `orders` yet (the import is running, or R4 `orders` is not served) this is still the orders step — the widget
      // draws its own waiting / empty / error state instead of the bare prompt the text step showed. A malformed `orders` is dropped.
      const p = w as PickOrdersWidgetSpec;
      return { kind: 'pick_orders', spec: isObj(p.orders) && Array.isArray(p.orders.groups) ? p : { ...p, orders: undefined } };
    }
    default:
      return { kind: 'text' };
  }
}

/* ── What a tap posts ── */

/** The `{stepId, rev, answer}` envelope (§6.2): both are mandatory, taken from the event the shipper is looking at. */
export function answerRequest(event: { stepId: string; rev: number }, answer: IntakeAnswerWire): AnswerRequest {
  return { stepId: event.stepId, rev: event.rev, answer };
}

/**
 * The line a spent widget keeps showing: what the shipper chose, as a `LocalisableText` so it matches what
 * the gateway's own history will say about the same answer (`gate.orders`, `describe.stepByStep`, …).
 * Null when the answer is not a visible choice (edit, edit_cancel, express …) — those leave no answer line.
 */
export function answerLabel(event: IntakeStepEvent, answer: IntakeAnswerWire, shown?: string): LocalisableText | null {
  if (answer.step === 'location') {
    // The widget knows the site's name (`shown`); a bare answer falls back to the candidate with that id, then to the id.
    const view0 = stepViewOf(event);
    const cand = view0.kind === 'location' ? view0.spec.candidates.find((c) => c.id === String(answer.locationId)) : undefined;
    const name = shown ?? cand?.title ?? `#${answer.locationId}`;
    return { key: 'history.location', params: { name }, fallbackText: `Site: ${name}` };
  }
  if (answer.step === 'cargo') {
    const summary = shown ?? String(answer.lines.length);
    return { key: 'history.cargo', params: { summary }, fallbackText: `Cargo: ${summary}` };
  }
  if (answer.step === 'window') {
    if (answer.anyTime) {
      // MS3-408: the same line the gateway's own history keeps for "any time".
      return answer.date
        ? { key: 'history.windowAnyTimeOn', params: { date: answer.date }, fallbackText: `When: ${answer.date}, any time` }
        : { key: 'history.windowAnyTime', fallbackText: 'When: any time' };
    }
    const when = shown ?? answer.date;
    return { key: 'history.window', params: { when }, fallbackText: `When: ${when}` };
  }
  if (answer.step === 'order_number') {
    if (answer.orderNumber === null) return { key: 'history.orderNumberSkip', fallbackText: 'No order number' };
    const number = answer.orderNumber.trim();
    return answer.link
      ? { key: 'history.orderNumberLink', params: { number }, fallbackText: `Linked to order ${number}` }
      : { key: 'history.orderNumber', params: { number }, fallbackText: `Order number: ${number}` };
  }
  if (answer.step === 'more_pickups') {
    const k = answer.choice === 'same_location' ? 'same' : answer.choice === 'another_location' ? 'other' : 'no';
    const fb = { same: 'More from this site', other: 'Another site', no: "No, that's all" }[k];
    return { key: `morePickups.${k}`, fallbackText: fb };
  }
  if (answer.step === 'pick_orders') {
    return { key: 'history.orders', params: { count: answer.orderIds.length }, fallbackText: `Orders: ${answer.orderIds.length}` };
  }
  const view = stepViewOf(event);
  if (answer.step === 'gate' && view.kind === 'gate') {
    const opt = view.spec.options.find((o) => o.id === answer.origin);
    return opt ? { key: opt.label.key, params: opt.label.params, fallbackText: opt.label.text } : null;
  }
  if (answer.step === 'order_split' && view.kind === 'order_split') {
    const opt = view.spec.options.find((o) => o.id === answer.mode);
    return opt ? { key: opt.label.key, params: opt.label.params, fallbackText: opt.label.text } : null;
  }
  if (answer.step === 'upload_offer' && view.kind === 'upload_offer') {
    const opt = view.spec.options.find((o) => o.id === answer.choice);
    return opt ? { key: opt.label.key, params: opt.label.params, fallbackText: opt.label.text } : null;
  }
  if (answer.step === 'describe' && view.kind === 'describe') {
    const l = view.spec.stepByStep;
    return { key: l.key, params: l.params, fallbackText: l.text };
  }
  if (answer.step === 'confirm_discard' && view.kind === 'confirm_discard') {
    const l = answer.confirm ? view.spec.yes : view.spec.no;
    return { key: l.key, params: l.params, fallbackText: l.text };
  }
  /* WP3c — the terms steps leave the same line the gateway's own history would (§11.2 "History answers reuse the
     option-label keys already in this table … and the `history.*` keys where it carries data"). */
  if (answer.step === 'tracking') {
    return answer.tracking ? { key: 'tracking.yes', fallbackText: 'Yes, track it' } : { key: 'tracking.no', fallbackText: 'No' };
  }
  if (answer.step === 'negotiable') {
    return answer.negotiable ? { key: 'negotiable.yes', fallbackText: 'Yes, negotiable' } : { key: 'negotiable.no', fallbackText: 'No, fixed price' };
  }
  if (answer.step === 'price') {
    if (answer.price === null) return { key: 'price.later', fallbackText: 'Decide later' };
    const price = formatAmount(answer.price);
    return { key: 'history.price', params: { price }, fallbackText: `Price: €${price}` };
  }
  if (answer.step === 'order_value') {
    if (answer.orderValue === null) return { key: 'orderValue.skip', fallbackText: 'Skip' };
    const value = formatAmount(answer.orderValue);
    return { key: 'history.orderValue', params: { value }, fallbackText: `Order value: €${value}` };
  }
  if (answer.step === 'channel' && view.kind === 'channel') {
    if (answer.channel === 'public') return { key: 'channel.public', fallbackText: 'Public marketplace' };
    if (answer.allPartners) {
      const count = view.spec.partners.count;
      return { key: 'channel.private.all', params: { count }, fallbackText: `Private · all my partners (${count})` };
    }
    const items = view.spec.partners.items ?? [];
    const names = answer.partnerIds.map((id) => (view.spec.suggested?.partnerId === id ? view.spec.suggested.name : items.find((p) => p.id === id)?.name));
    const who = names.length > 0 && names.every((n): n is string => !!n) ? names.join(', ') : null;
    return who ? { key: 'history.channel', params: { who }, fallbackText: `Send to: ${who}` } : null;
  }
  if (answer.step === 'vehicle' && view.kind === 'vehicle') {
    const id = answer.typeIds[0];
    const name = view.spec.recommended?.typeId === id ? view.spec.recommended.label : view.spec.alternatives.find((a) => a.typeId === id)?.label;
    return name ? { key: 'history.vehicle', params: { name }, fallbackText: `Truck: ${name}` } : null;
  }
  return null;
}

/* ── WP3c: amounts and the answers of the two list-like steps ── */

export interface AmountRules { maxIntDigits: number; decimals: number; allowZero: boolean }
export type AmountParse = NumberParse;

/**
 * A typed amount (QA-1). Thousands separators and the decimal mark are read the way the shipper's language writes them —
 * `1.234,50` (Greek) and `1,234.50` (English) are both 1234.5; `12,5` and `12.5` are both 12.5; an ambiguous single group
 * (`1.234`) follows the language (see `numberFormat.ts`). `€` and spaces are ignored. Mirrors the gateway's rule (§5.1: `>0`,
 * ≤7 integer digits, ≤2 decimals); the gateway stays the judge, this only keeps an obviously wrong value from being sent.
 */
export function parseAmount(raw: string, rules: AmountRules, loc: NumberLocale = EN_NUMBERS): AmountParse {
  return parseNumber(raw, rules, loc);
}

export const parsePrice = (raw: string, spec?: { maxIntDigits?: number; decimals?: number }, loc: NumberLocale = EN_NUMBERS): AmountParse =>
  parseAmount(raw, { maxIntDigits: spec?.maxIntDigits ?? 7, decimals: spec?.decimals ?? 2, allowZero: false }, loc);

/**
 * §19.7: 0 ≤ value ≤ 99,999,999.99 (≤ 8 integer digits), at most 2 decimals; a blank or 0 value means "skip".
 * A blank box parses as 0 (ok), so "Set value" on an empty box is a skip, not a dead button; the widget posts `null` for 0.
 */
export const ORDER_VALUE_MAX = 99_999_999.99;
export function parseOrderValue(raw: string, loc: NumberLocale = EN_NUMBERS): AmountParse {
  if (raw.replace(/[\s\u00a0€]/g, '') === '') return { ok: true, value: 0 };
  const r = parseAmount(raw, { maxIntDigits: 8, decimals: 2, allowZero: true }, loc);
  return r.ok && r.value > ORDER_VALUE_MAX ? { ok: false, reason: 'invalid' } : r;
}
/** What `order_value` posts for a parsed amount: 0 is a skip (§19.7). */
export const orderValueAnswerOf = (value: number): number | null => (value > 0 ? value : null);

/** 640 → "640", 12.5 → "12.5", 12.345 → "12.35": what goes back into the box and into the history line. */
export const formatAmount = (n: number): string => String(Math.round(n * 100) / 100);

/** §8.8: the shipper's remembered answer, else ON. */
export const trackingDefaultOf = (spec: TrackingWidgetSpec): boolean => spec.default !== false;

/**
 * §19.5: above 50 partners the gateway sends no inline list, and "choose partners" stays hidden until R4 `partners` is served
 * (the contract lists the kind, §6.3; the gateway had no `options` route at the time of writing). Flip this when it ships.
 */
export const PARTNERS_R4_LIVE = false;

export type ChannelChoice = { kind: 'all' } | { kind: 'partner'; partnerId: string } | { kind: 'partners'; partnerIds: readonly string[] } | { kind: 'public' };
/** §5.1 `channel`: private ⇒ `allPartners:true` or ≥1 partner; public ⇒ no partners. */
export function channelAnswer(choice: ChannelChoice): IntakeAnswerWire {
  if (choice.kind === 'public') return { step: 'channel', channel: 'public', partnerIds: [] };
  if (choice.kind === 'partner') return { step: 'channel', channel: 'private', partnerIds: [choice.partnerId] };
  if (choice.kind === 'partners') return { step: 'channel', channel: 'private', partnerIds: [...new Set(choice.partnerIds)] };
  return { step: 'channel', channel: 'private', partnerIds: [], allPartners: true };
}

/** §8.3 pre-selection: private + all partners; public only when the gateway proposed it (§18: public is never defaulted). */
export function channelDefaultOf(spec: ChannelWidgetSpec): 'all' | 'public' | null {
  if (spec.proposal === 'public') return 'public';
  // §20.15: `defaultChoice` is "private_all" | null and only PRE-SELECTS. "public", an unknown word or null ⇒ nothing pre-selected.
  // A gateway that does not send it yet (undefined) keeps the earlier rule: all partners when there are any.
  const d: unknown = spec.defaultChoice;
  if (d === undefined) return spec.partners.count > 0 ? 'all' : null;
  return d === 'private_all' && spec.partners.count > 0 ? 'all' : null;
}

/** MS3-409: the partners ticked before the shipper touches the list (MS3-409): what the gateway proposes. */
export function proposedPartnerIds(spec: ChannelWidgetSpec, rows: readonly { id: string }[]): string[] {
  if (channelDefaultOf(spec) === 'all') return rows.map((row) => row.id);
  const suggested = spec.suggested?.partnerId;
  return suggested && rows.some((row) => row.id === suggested) ? [suggested] : [];
}

/**
 * §5.1 `vehicle`, with the §19.2 rule: a truck TYPE picked without a subtype sends `categoryIds: []` — the gateway reads
 * "no subtype named" as "the whole type". A subtype is sent only if the shipper tapped it, and only if it belongs to the
 * type being sent (`offered` = the subtypes that type is listed with). Never "every subtype the type has".
 */
export const vehicleAnswer = (typeId: string, tappedCategoryIds: readonly string[] = [], offered?: readonly string[]): IntakeAnswerWire =>
  ({
    step: 'vehicle', typeIds: [typeId],
    categoryIds: [...new Set(tappedCategoryIds)].filter((c) => offered === undefined || offered.includes(c)),
  });

/** §19.4: strict equality on the four values — `'OK'`, `'too_small'`, `'SMALL'` are not fits. */
export function fitOf(raw: unknown): VehicleFit | null {
  return raw === 'FITS' || raw === 'TIGHT' || raw === 'OVERSIZED' || raw === 'TOO_SMALL' ? raw : null;
}
/** §19.4: "A recommendation is never TOO_SMALL" — when one is, it is NOT recommended (no tag, not pre-selected); it is listed like any truck, with its warning. */
export const recommendationUsable = <R extends { fit?: unknown }>(rec: R | undefined): rec is R => !!rec && fitOf(rec.fit) !== 'TOO_SMALL';

/** The note a fit earns (§19.4): FITS none; TIGHT / OVERSIZED neutral; TOO_SMALL a warning that never blocks the pick. */
export function fitNote(fit: VehicleFit | null): { key: 'vehicle.tight' | 'vehicle.oversized' | 'vehicle.tooSmall'; tone: 'info' | 'warning' } | null {
  if (fit === 'TIGHT') return { key: 'vehicle.tight', tone: 'info' };
  if (fit === 'OVERSIZED') return { key: 'vehicle.oversized', tone: 'info' };
  if (fit === 'TOO_SMALL') return { key: 'vehicle.tooSmall', tone: 'warning' };
  return null;
}

/** MS3-405: a typed order number - control characters out, trimmed; null when nothing usable is left (the gateway's rule: 1-100). */
export function orderNumberOf(raw: string, max = 100): string | null {
  const value = [...raw].filter((ch) => { const c = ch.charCodeAt(0); return c > 0x1f && c !== 0x7f; }).join('').trim();
  return value.length > 0 && value.length <= max ? value : null;
}

/** A typed description in the Describe widget: trimmed, and empty means "nothing to send". */
export function describeText(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

/**
 * Jump links for "what's missing": one per distinct step the gate named. The summary itself (`routeNeeded`)
 * is not a step to jump to, so it never becomes a link.
 */
export function jumpTargets(missing: { step: string; stopKey?: string; label: { text: string } }[]): {
  step: string; stopKey?: string; label: string;
}[] {
  const seen = new Set<string>();
  const out: { step: string; stopKey?: string; label: string }[] = [];
  for (const m of missing) {
    if (m.step === 'summary') continue;
    const key = `${m.step}|${m.stopKey ?? ''}|${m.label.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ step: m.step, ...(m.stopKey ? { stopKey: m.stopKey } : {}), label: m.label.text });
  }
  return out;
}


/* ── WP3b: the location step ── */

/** §5.1 `location`: the id is a number on the wire (R4 option ids are strings); an id that is not a whole number is not sent. */
export function locationAnswer(stopKey: string | undefined, id: string): IntakeAnswerWire | null {
  const n = Number(id);
  return stopKey && /^\d+$/.test(id.trim()) && Number.isSafeInteger(n) ? { step: 'location', stopKey, locationId: n } : null;
}

/** §8.3: pickup ⇒ `my_locations`, drop-off ⇒ `customers` (MS3-398), unless the gateway says otherwise. */
export const defaultTabOf = (spec: Pick<LocationWidgetSpec, 'role' | 'defaultTab'>): Directory =>
  spec.defaultTab ?? (spec.role === 'dropoff' ? 'customers' : 'my_locations');

/** The grey line under a candidate: its address line, the badges and the distance. */
export function optionDetail(o: OptionItem): string | undefined {
  const parts = [o.subtitle, ...(o.badges ?? []), typeof o.distanceKm === 'number' ? `${Math.round(o.distanceKm * 10) / 10} km` : undefined]
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}
