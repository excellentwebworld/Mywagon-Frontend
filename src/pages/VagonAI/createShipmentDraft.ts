/**
 * The load the review card shows, and the rules it checks against.
 *
 * One object, seeded by the gateway, edited in place on the card and sent once.
 * It used to be filled in across eleven cards; the gateway assembles it now
 * (`shipmentFlow/autoDraft.ts`) and the shipper reads it rather than building
 * it, so what is left here is the EDIT model — what changes when they correct
 * something, and what the buttons do about it.
 *
 * ## Two bars, not one
 *
 * `saveIssues` is what stops Save as draft; `sendIssues` is what stops the load
 * going to the carrier. They are different on purpose and the difference is the
 * point of the redesign: a draft exists to hold an unfinished load, so a missing
 * price must never grey out the button whose whole job is to keep the work. The
 * gateway draws the same line (`blocks_save` versus `blocks_send`) and wins any
 * disagreement.
 *
 * ## This validation is an affordance, not a gate
 *
 * Everything in `blockingIssues` is re-derived server-side by the publish gate,
 * which trusts neither this file nor the model. What it is for is telling the
 * shipper *before* they press Publish, so the answer to "why is this disabled"
 * is on screen rather than one round trip away. If the two ever disagree the
 * server wins, and its `missing[]` names the card to go back to.
 *
 * Pure, and deliberately free of React so it can be reasoned about — and tested
 * — on its own, like `threadCards.ts` beside it.
 */
import type { FlowBundle } from '../../hooks/useChat';
import { ensureStopSchedules } from './applyLocationChoiceToDraft';
import { englishTr, type Tr } from './i18n';

const K = 'vagonai.review.issues';

export type StopRole = 'pickup' | 'dropoff';
export type LineAction = 'pick' | 'drop';
export type QtyUnit = 'EUR_PALLET' | 'UNIT';
export type WeightUnit = 'KG' | 'T';
/**
 * One channel, and it is applied rather than chosen.
 *
 * Private is the default. The review card can flip to Public explicitly
 * (MS3-347); public loads skip named-carrier selection.
 */
export type BroadcastChannel = 'private' | 'public';

export interface DraftLine {
  productId: string;
  action: LineAction;
  qty: number;
  unit: QtyUnit;
  weight: number;
  wUnit: WeightUnit;
  orderId: string | null;
  orderLineId: string | null;
  customerId: string | null;
}

/**
 * A stop, with the cargo handled AT that stop nested inside it.
 *
 * Containment is the cargo-to-stop association — the same shape the web wizard
 * has always used (`stop.lines[]` in `CreateShipmentWizard/types.ts`) and the
 * same shape the gateway's own draft now takes. A load collected at stop 1 and
 * split across deliveries at stops 2 and 3 needs no allocation field to say so:
 * the quantity sitting under each stop already says it.
 *
 * There is no `role`. A stop's leg is derived from its own lines by `stopRole`,
 * because a middle stop part-delivers and part-collects and no single label fits
 * it — the same reason the wizard derives its stop tags rather than storing one.
 */
export interface DraftStop {
  locationId: string;
  /** ISO local, `YYYY-MM-DDTHH:mm` — exactly what a datetime-local input emits. */
  from: string;
  to: string | null;
  lines: DraftLine[];
}

export interface ShipmentDraft {
  customerReference: string | null;
  stops: DraftStop[];
  vehicleTypeIds: string[];
  /** Subtype ids narrowing the types above (bundle.vehicleTypes[].subtypeOptions). */
  vehicleCategoryIds: string[];
  broadcast: { channels: BroadcastChannel[]; carrierPartnerIds: string[]; driverId: string | null };
  pricing: {
    negotiable: boolean;
    startingPrice: number | null;
    negotiableFloor: number | null;
    currency: string;
  };
  requireTracking: boolean;
  responseWindow: string;
  settlement: string;
  bulk: { mode: string };
  trackingOrderIds: string[];
}

/**
 * The load, as the gateway assembled it.
 *
 * Almost a straight copy: the seed IS this shape, field for field, which is why
 * there is no mapping table here and no place for the two to drift. What this
 * adds is the display-only names the card needs but the wire does not carry back
 * - the order's own words for a site or a product it could not match - kept
 * beside the draft rather than inside it, so they cannot be posted by accident.
 *
 * ## Nothing is invented to fill a hole
 *
 * A seed can be short of three things: a saved site (the order's origin may be
 * free text only), a Product Master id (its line may never have been matched),
 * and a date. Each stays empty and is reported by `saveIssues` like any other
 * unanswered field, because the alternative - picking the site whose name looks
 * closest - is how freight gets collected from the wrong warehouse.
 */
export function draftFromSeed(bundle: FlowBundle): ShipmentDraft {
  const seed = bundle.draft;

  const seeded: ShipmentDraft = {
    customerReference: seed.customerReference ?? null,
    stops: seed.stops.map((stop) => ({
      locationId: stop.locationId ?? '',
      from: stop.from ?? '',
      to: stop.to ?? null,
      lines: stop.lines.map((line) => ({
        productId: line.productId ?? '',
        action: line.action,
        qty: line.qty ?? 0,
        unit: line.unit,
        weight: line.weight ?? 0,
        wUnit: line.wUnit,
        orderId: line.orderId ?? null,
        orderLineId: line.orderLineId ?? null,
        customerId: line.customerId ?? null,
      })),
    })),
    vehicleTypeIds: [...(seed.vehicleTypeIds ?? [])],
    vehicleCategoryIds: [...((seed as { vehicleCategoryIds?: string[] }).vehicleCategoryIds ?? [])],
    broadcast: {
      // Private is the default (MS3-347). The review-card toggle may flip to
      // public afterward; mergeSeedIntoDraft preserves that choice.
      channels: ['private'],
      carrierPartnerIds: [...(seed.broadcast?.carrierPartnerIds ?? [])],
      driverId: null,
    },
    pricing: {
      negotiable: seed.pricing?.negotiable ?? bundle.defaults.negotiable ?? true,
      startingPrice: seed.pricing?.startingPrice ?? null,
      negotiableFloor: seed.pricing?.negotiableFloor ?? null,
      currency: seed.pricing?.currency ?? bundle.defaults.currency ?? 'EUR',
    },
    requireTracking: seed.requireTracking ?? bundle.defaults.requireTracking ?? false,
    responseWindow: seed.responseWindow ?? bundle.defaults.responseWindow ?? '48h',
    settlement: seed.settlement ?? bundle.defaults.settlement ?? 'direct',
    bulk: { mode: seed.bulk?.mode ?? bundle.defaults.bulkMode ?? 'single' },
    trackingOrderIds: [...(seed.trackingOrderIds ?? [])],
  };
  return ensureStopSchedules(seeded);

}

/**
 * What the order called a site or a product it could not match, by field path.
 *
 * The picker for a gap opens pre-searched on these, which is the difference
 * between "pick the collection site" and "pick the collection site - the order
 * says Athens Depot". Read off the seed rather than the draft because the draft
 * is what gets posted, and a display name on it would be a field the server has
 * no column for.
 */
/**
 * Folds a newer assembled seed into the draft the shipper is already editing.
 *
 * Chat answers to outstanding gaps re-emit `flow_context` with an updated seed.
 * Blindly replacing the draft would wipe corrections they typed on the card;
 * ignoring the seed would leave Save disabled for values they already gave in
 * chat. Empty / zero fields take the seed's value; fields they already filled
 * keep theirs. Cargo lines match by orderLineId, then productId + action.
 *
 * `previous` is the seed this card last merged, and it is what lets a chat
 * EDIT through. "Set price 500" on a card that already shows 420 refreshes the
 * seed with 500 - and fill-the-blanks alone keeps the 420, so the assistant
 * says the price changed while the card says it did not. A field whose seed
 * value moved since `previous` was changed by the shipper in chat, so the seed
 * wins it; a field the seed did not move keeps whatever the card holds, which
 * is what still protects a correction typed on the card.
 */
export function mergeSeedIntoDraft(
  current: ShipmentDraft,
  incoming: ShipmentDraft,
  previous?: ShipmentDraft,
): ShipmentDraft {
  const pickStr = (cur: string, next: string) => (cur && cur.trim() ? cur : next);
  const pickNum = (cur: number, next: number) => (cur > 0 ? cur : next);
  const pickNullable = <T,>(cur: T | null, next: T | null): T | null => (cur != null ? cur : next);
  // Serialised rather than compared by reference: every seed is a fresh object,
  // and the arrays in it are copies.
  const moved = (next: unknown, base: unknown) =>
    previous !== undefined && JSON.stringify(next) !== JSON.stringify(base);

  const mergeLine = (cur: DraftLine | undefined, next: DraftLine, base: DraftLine | undefined): DraftLine => {
    if (!cur) return { ...next };
    // A line the previous seed did not have is new to the seed, not moved by it,
    // so it falls back to filling blanks like every line did before.
    const edited = (pick: (line: DraftLine) => unknown) => base !== undefined && moved(pick(next), pick(base));
    const qtyEdited = edited((line) => [line.qty, line.unit]);
    const weightEdited = edited((line) => [line.weight, line.wUnit]);
    return {
      productId: edited((line) => line.productId) ? next.productId : pickStr(cur.productId, next.productId),
      action: cur.action || next.action,
      qty: qtyEdited ? next.qty : pickNum(cur.qty, next.qty),
      unit: qtyEdited ? next.unit : cur.qty > 0 ? cur.unit : next.unit,
      weight: weightEdited ? next.weight : pickNum(cur.weight, next.weight),
      wUnit: weightEdited ? next.wUnit : cur.weight > 0 ? cur.wUnit : next.wUnit,
      orderId: pickNullable(cur.orderId, next.orderId),
      orderLineId: pickNullable(cur.orderLineId, next.orderLineId),
      customerId: pickNullable(cur.customerId, next.customerId),
    };
  };

  const matchLine = (pool: DraftLine[], next: DraftLine): { line: DraftLine | undefined; index: number } => {
    if (next.orderLineId) {
      const index = pool.findIndex((l) => l.orderLineId && l.orderLineId === next.orderLineId && l.action === next.action);
      if (index >= 0) return { line: pool[index], index };
    }
    if (next.productId) {
      const index = pool.findIndex((l) => l.productId && l.productId === next.productId && l.action === next.action);
      if (index >= 0) return { line: pool[index], index };
    }
    return { line: undefined, index: -1 };
  };

  const stopCount = Math.max(current.stops.length, incoming.stops.length);
  const stops: DraftStop[] = [];
  for (let i = 0; i < stopCount; i += 1) {
    const cur = current.stops[i];
    const next = incoming.stops[i];
    if (!next && cur) {
      stops.push(cur);
      continue;
    }
    if (!cur && next) {
      stops.push({
        locationId: next.locationId,
        from: next.from,
        to: next.to,
        lines: next.lines.map((l) => ({ ...l })),
      });
      continue;
    }
    if (!cur || !next) continue;

    const base = previous?.stops[i];
    const stopEdited = (pick: (stop: DraftStop) => unknown) => base !== undefined && moved(pick(next), pick(base));

    const used = new Set<number>();
    const lines: DraftLine[] = next.lines.map((nLine) => {
      const { line, index } = matchLine(cur.lines, nLine);
      if (index >= 0) used.add(index);
      return mergeLine(line, nLine, base ? matchLine(base.lines, nLine).line : undefined);
    });
    // Keep lines the shipper added locally that the seed does not know about.
    cur.lines.forEach((l, idx) => {
      if (!used.has(idx)) lines.push(l);
    });

    stops.push({
      locationId: stopEdited((stop) => stop.locationId) ? next.locationId : pickStr(cur.locationId, next.locationId),
      from: stopEdited((stop) => stop.from) ? next.from : pickStr(cur.from, next.from),
      to: stopEdited((stop) => stop.to) ? next.to : cur.to ?? next.to,
      lines,
    });
  }

  const priceEdited = moved(incoming.pricing.startingPrice, previous?.pricing.startingPrice);

  return {
    customerReference: moved(incoming.customerReference, previous?.customerReference)
      ? incoming.customerReference
      : pickNullable(current.customerReference, incoming.customerReference),
    stops,
    vehicleTypeIds: moved(incoming.vehicleTypeIds, previous?.vehicleTypeIds) || current.vehicleTypeIds.length === 0
      ? [...incoming.vehicleTypeIds]
      : current.vehicleTypeIds,
    vehicleCategoryIds:
      moved(
        (incoming as { vehicleCategoryIds?: string[] }).vehicleCategoryIds ?? [],
        (previous as { vehicleCategoryIds?: string[] } | undefined)?.vehicleCategoryIds,
      ) || current.vehicleCategoryIds.length === 0
        ? [...((incoming as { vehicleCategoryIds?: string[] }).vehicleCategoryIds ?? [])]
        : current.vehicleCategoryIds,
    broadcast: {
      channels: (current.broadcast.channels.includes('public')
        ? (['public'] as BroadcastChannel[])
        : (['private'] as BroadcastChannel[])),
      carrierPartnerIds:
        moved(incoming.broadcast.carrierPartnerIds, previous?.broadcast.carrierPartnerIds) ||
        current.broadcast.carrierPartnerIds.length === 0
          ? [...incoming.broadcast.carrierPartnerIds]
          : current.broadcast.carrierPartnerIds,
      driverId: current.broadcast.driverId ?? incoming.broadcast.driverId,
    },
    pricing: {
      negotiable: moved(incoming.pricing.negotiable, previous?.pricing.negotiable)
        ? incoming.pricing.negotiable
        : current.pricing.startingPrice != null ? current.pricing.negotiable : incoming.pricing.negotiable,
      startingPrice: priceEdited
        ? incoming.pricing.startingPrice
        : pickNullable(current.pricing.startingPrice, incoming.pricing.startingPrice),
      negotiableFloor: moved(incoming.pricing.negotiableFloor, previous?.pricing.negotiableFloor)
        ? incoming.pricing.negotiableFloor
        : pickNullable(current.pricing.negotiableFloor, incoming.pricing.negotiableFloor),
      currency: current.pricing.currency || incoming.pricing.currency,
    },
    requireTracking: moved(incoming.requireTracking, previous?.requireTracking)
      ? incoming.requireTracking
      : current.requireTracking || incoming.requireTracking,
    responseWindow: current.responseWindow || incoming.responseWindow,
    settlement: current.settlement || incoming.settlement,
    bulk: { mode: current.bulk.mode || incoming.bulk.mode },
    trackingOrderIds:
      current.trackingOrderIds.length > 0 ? current.trackingOrderIds : [...incoming.trackingOrderIds],
  };
}

export function gapHints(bundle: FlowBundle): Record<string, string> {
  const hints: Record<string, string> = {};
  bundle.draft.stops.forEach((stop, i) => {
    if (!stop.locationId && stop.locationName) hints[`stops[${i}].locationId`] = stop.locationName;
    stop.lines.forEach((line, j) => {
      if (!line.productId && line.productName) hints[`stops[${i}].lines[${j}].productId`] = line.productName;
    });
  });
  return hints;
}

/**
 * The orders a prefilled load can send a tracking link for.
 *
 * Keyed off the cargo lines rather than off `bundle.prefill.orders`, because the
 * shipper may have deleted a line: MYVAGON accepts `tracking_emails` only
 * against order ids that are actually on the draft's cargo and silently drops
 * anything else, so an order with nothing left on the load has to disappear from
 * the offer too rather than be promised and dropped.
 */
export function trackingCandidates(
  draft: ShipmentDraft,
  bundle: FlowBundle,
): { orderId: string; reference: string; customerName: string; email: string | null }[] {
  const onDraft = new Set(allLines(draft).map((line) => line.orderId).filter(Boolean));
  return (bundle.orders ?? [])
    .filter((order) => onDraft.has(order.orderId))
    .map((order) => ({
      orderId: order.orderId,
      reference: order.reference,
      customerName: order.customerName,
      email: order.trackingEmail,
    }));
}

/** Adds or removes one order from the tracking-link list. */
export function toggleTrackingOrder(draft: ShipmentDraft, orderId: string): ShipmentDraft {
  const on = draft.trackingOrderIds.includes(orderId);
  return {
    ...draft,
    trackingOrderIds: on
      ? draft.trackingOrderIds.filter((id) => id !== orderId)
      : [...draft.trackingOrderIds, orderId],
  };
}

/**
 * Adds or removes one carrier from the private-network list.
 *
 * Additive, and that is the whole point of it existing separately from the
 * truck-type picker beside it on the card. A private load carries a LIST of
 * carriers - `selected_carriers` on step 3 has always been an array, MYVAGON's
 * own wizard ticks as many as the shipper likes, and the gateway's
 * `partner_ids` is `z.array(...).min(1)` with no upper bound. Only the review
 * card disagreed, replacing the list on every tap, so a shipper who wanted the
 * load offered to three carriers silently ended up sending it to the last one
 * they touched.
 *
 * Order is preserved: the first carrier ticked stays first, so the summary line
 * reads back in the order the shipper built it.
 */
export function toggleCarrier(draft: ShipmentDraft, partnerId: string): ShipmentDraft {
  const on = draft.broadcast.carrierPartnerIds.includes(partnerId);
  return {
    ...draft,
    broadcast: {
      ...draft.broadcast,
      carrierPartnerIds: on
        ? draft.broadcast.carrierPartnerIds.filter((id) => id !== partnerId)
        : [...draft.broadcast.carrierPartnerIds, partnerId],
    },
  };
}

/**
 * Additive truck-type toggle — loads may accept Semi + Truckload together (MS3-347).
 *
 * Switching a type OFF also drops its subtypes. They would otherwise stay on the
 * draft with no row left on screen to untick them, and the gateway refuses a
 * publish whose subtype belongs to no chosen type — so the shipper would be
 * blocked by a choice they can no longer see.
 */
export function toggleVehicleType(
  draft: ShipmentDraft,
  typeId: string,
  subtypeIdsOfType: readonly string[] = [],
): ShipmentDraft {
  const on = draft.vehicleTypeIds.includes(typeId);
  if (!on) return { ...draft, vehicleTypeIds: [...draft.vehicleTypeIds, typeId] };
  const dropped = new Set(subtypeIdsOfType);
  return {
    ...draft,
    vehicleTypeIds: draft.vehicleTypeIds.filter((id) => id !== typeId),
    vehicleCategoryIds: draft.vehicleCategoryIds.filter((id) => !dropped.has(id)),
  };
}

/** Additive trailer-subtype toggle (vehicleCategoryIds). */
export function toggleVehicleCategory(draft: ShipmentDraft, categoryId: string): ShipmentDraft {
  const on = draft.vehicleCategoryIds.includes(categoryId);
  return {
    ...draft,
    vehicleCategoryIds: on
      ? draft.vehicleCategoryIds.filter((id) => id !== categoryId)
      : [...draft.vehicleCategoryIds, categoryId],
  };
}

/**
 * Flip private ↔ public.
 *
 * The ticked carriers are kept, not cleared: a public load simply does not send
 * them (the gateway drops `partner_ids` for a public publish), and a shipper who
 * taps Public by mistake gets their list back on the way to Private instead of
 * having to tick three carriers again.
 */
export function setBroadcastChannel(draft: ShipmentDraft, channel: BroadcastChannel): ShipmentDraft {
  return {
    ...draft,
    broadcast: { ...draft.broadcast, channels: [channel] },
  };
}


/**
 * Which leg a stop is, read off its own cargo.
 *
 * `'both'` is a real answer and the reason this exists: a middle stop on a
 * multi-drop run part-delivers and part-collects. `null` means no cargo yet,
 * which is the ordinary state of a stop the shipper has just added.
 */
export function stopRole(stop: DraftStop): StopRole | 'both' | null {
  const collects = stop.lines.some((l) => l.action === 'pick');
  const delivers = stop.lines.some((l) => l.action === 'drop');
  if (collects && delivers) return 'both';
  if (collects) return 'pickup';
  if (delivers) return 'dropoff';
  return null;
}

/** Every cargo line on the load, in travel order. */
export const allLines = (d: ShipmentDraft): DraftLine[] => d.stops.flatMap((s) => s.lines);

/**
 * The first and last stop, which is what the Pickup and Delivery cards write.
 *
 * Positional rather than derived from cargo, and deliberately so: these back the
 * two cards that come BEFORE any product is chosen, so there is no cargo to
 * derive a leg from yet. `stopRole` is the derived view, used once cargo exists.
 */
export const pickupStop = (d: ShipmentDraft) => d.stops[0] ?? null;
export const deliveryStop = (d: ShipmentDraft) => (d.stops.length > 1 ? d.stops.at(-1) ?? null : null);

const blankStop = (): DraftStop => ({ locationId: '', from: '', to: null, lines: [] });

/**
 * Writes the site and window of one stop by INDEX, keeping its cargo.
 *
 * Index rather than role, which is what lets a load have more than two stops at
 * all: the old version replaced whatever stop shared the incoming role, so a
 * second delivery silently overwrote the first.
 *
 * Missing stops are filled in with blanks rather than the write being dropped,
 * because the Delivery card writes index 1 on a draft that may still be empty.
 */
export function setStopAt(draft: ShipmentDraft, index: number, patch: Partial<DraftStop>): ShipmentDraft {
  const stops = [...draft.stops];
  while (stops.length <= index) stops.push(blankStop());
  stops[index] = { ...stops[index]!, ...patch };
  return { ...draft, stops };
}

/** Inserts a blank stop at `index`, pushing the rest of the itinerary down. */
export function addStopAt(draft: ShipmentDraft, index: number): ShipmentDraft {
  const stops = [...draft.stops];
  stops.splice(Math.max(0, Math.min(index, stops.length)), 0, blankStop());
  return { ...draft, stops };
}

/**
 * Removes a stop and its cargo, never below two.
 *
 * The cargo goes with it. Re-homing it onto a neighbour would be a guess about
 * an allocation the shipper stated, and silently moving freight to a site they
 * did not choose is worse than making them re-enter it.
 */
export function removeStopAt(draft: ShipmentDraft, index: number): ShipmentDraft {
  if (draft.stops.length <= 2) return draft;
  return { ...draft, stops: draft.stops.filter((_, i) => i !== index) };
}

/** Replaces the cargo of one stop. */
export function setStopLines(draft: ShipmentDraft, index: number, lines: DraftLine[]): ShipmentDraft {
  return setStopAt(draft, index, { lines });
}

/** Moves one cargo line from the stop it is on to another. */
export function moveLine(
  draft: ShipmentDraft,
  fromStop: number,
  lineIndex: number,
  toStop: number,
): ShipmentDraft {
  const line = draft.stops[fromStop]?.lines[lineIndex];
  if (!line || fromStop === toStop || !draft.stops[toStop]) return draft;
  return {
    ...draft,
    stops: draft.stops.map((stop, i) => {
      if (i === fromStop) return { ...stop, lines: stop.lines.filter((_, j) => j !== lineIndex) };
      if (i === toStop) return { ...stop, lines: [...stop.lines, line] };
      return stop;
    }),
  };
}

/*
 * `toggleChannel` is gone.
 *
 * It applied the fleet-is-exclusive rule across three channels. There is one
 * channel now and no control that sets it, so a toggle could only ever turn the
 * load off.
 */

/** Running totals for the load summary — pick lines only, so a direct run is not doubled. */
export function loadTotals(draft: ShipmentDraft): {
  qtyByUnit: Record<string, number>;
  weightByUnit: Record<string, number>;
  lineCount: number;
} {
  const picks = allLines(draft).filter((l) => l.action === 'pick');
  const qtyByUnit: Record<string, number> = {};
  const weightByUnit: Record<string, number> = {};
  for (const line of picks) {
    qtyByUnit[line.unit] = (qtyByUnit[line.unit] ?? 0) + line.qty;
    weightByUnit[line.wUnit] = (weightByUnit[line.wUnit] ?? 0) + line.weight;
  }
  return { qtyByUnit, weightByUnit, lineCount: picks.length };
}

/* -------------------------------------------------------------------------- *
 * Validation
 * -------------------------------------------------------------------------- */

export interface DraftIssue {
  /** The draft field path, matching the server's `missing[]` entries exactly. */
  field: string;
  message: string;
}

const parseLocal = (v: string | null): number | null => {
  if (!v) return null;
  const ms = new Date(`${v}:00`).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * The rows of the review card, in the order they are read.
 *
 * This replaces `STEP`, which named twelve cards the shipper walked through.
 * They are rows on one card now, and the list is shorter than the old one by
 * more than the collapsing explains: `sendTo` is gone because there is one
 * channel, and `truck` survives only as a row to CORRECT, never one to answer.
 *
 * Route and cargo first because they are the load. Truck and carrier next,
 * because they are what the assembly decided and therefore what a shipper is
 * most likely to want to change. Price after them. Options last: tracking and
 * the customer link are real, but nobody opens the card to set them.
 */
export const SECTIONS = ['route', 'cargo', 'truck', 'carrier', 'price', 'extras'] as const;
export type SectionId = (typeof SECTIONS)[number];

/**
 * Which row owns a field the server refused on, or a gap the gateway reported.
 *
 * The publish gate answers in draft field paths and the shipper has to land on
 * the control that owns the one that failed - an error with no way back to the
 * control that caused it is the failure this mapping prevents.
 */
export function sectionForField(field: string): SectionId {
  // Cargo is tested BEFORE the stop prefix, and the order is load-bearing: a
  // cargo error on the pickup stop reads as `stops[0].lines[0].qty`, so testing
  // the stop prefix first would send the shipper to the site picker to fix a
  // quantity.
  if (/^stops\[\d+\]\.lines/.test(field) || field.startsWith('lines')) return 'cargo';
  if (field.startsWith('stops')) return 'route';
  if (field.startsWith('vehicleTypeIds') || field.startsWith('vehicleCategoryIds')) return 'truck';
  if (field.startsWith('broadcast')) return 'carrier';
  if (field.startsWith('pricing')) return 'price';
  return 'extras';
}

/** Whether a row has anything unanswered on it. */
export function sectionComplete(draft: ShipmentDraft, section: SectionId, now: number = Date.now()): boolean {
  return ![...saveIssues(draft, now), ...sendIssues(draft)].some(
    (issue) => sectionForField(issue.field) === section,
  );
}

/** The issues one row is answerable for, whichever bar they belong to. */
export function sectionIssues(
  draft: ShipmentDraft,
  section: SectionId,
  now: number = Date.now(),
  tr: Tr = englishTr,
): DraftIssue[] {
  return [...saveIssues(draft, now, tr), ...sendIssues(draft, tr)].filter(
    (issue) => sectionForField(issue.field) === section,
  );
}

/**
 * Which row the card opens on, or null to open with everything collapsed.
 *
 * The first row with something genuinely missing, so a prepared load that is
 * ready to save opens CLOSED - the whole load readable at a glance, nothing
 * demanding attention. That is the ordinary case now, and it is the one the card
 * is designed around.
 */
export function openingSection(draft: ShipmentDraft, now: number = Date.now()): SectionId | null {
  const blocking = saveIssues(draft, now);
  if (blocking.length === 0) return null;
  return SECTIONS.find((section) => blocking.some((issue) => sectionForField(issue.field) === section)) ?? null;
}

function broadcastIssues(draft: ShipmentDraft, tr: Tr): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const { channels, carrierPartnerIds } = draft.broadcast;

  if (channels.length === 0) {
    issues.push({ field: 'broadcast.channels', message: tr(`${K}.noChannel`, 'This load has no channel.') });
    return issues;
  }
  const isPublic = channels.includes('public');
  if (!isPublic && carrierPartnerIds.length === 0) {
    issues.push({ field: 'broadcast.carrierPartnerIds', message: tr(`${K}.chooseCarrier`, 'Choose the carrier this goes to.') });
  }
  return issues;
}

/**
 * The CR9 pricing rules.
 *
 * A negotiable load with a blank price is valid — that is "always negotiable",
 * a real choice — so the only mandatory price is on a fixed one.
 */
function pricingIssues(draft: ShipmentDraft, tr: Tr): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const { negotiable, startingPrice, negotiableFloor } = draft.pricing;

  if (!negotiable && !(startingPrice && startingPrice > 0)) {
    issues.push({ field: 'pricing.startingPrice', message: tr(`${K}.fixedPriceNeeded`, 'A non-negotiable load needs a fixed price.') });
  }
  if (startingPrice !== null && !(startingPrice > 0)) {
    issues.push({ field: 'pricing.startingPrice', message: tr(`${K}.priceAboveZero`, 'The price must be greater than zero.') });
  }
  if (negotiableFloor !== null && startingPrice === null) {
    issues.push({ field: 'pricing.startingPrice', message: tr(`${K}.floorNeedsPrice`, 'A floor needs an asking price to sit under.') });
  }
  if (negotiableFloor !== null && startingPrice !== null && negotiableFloor > startingPrice) {
    issues.push({ field: 'pricing.negotiableFloor', message: tr(`${K}.floorAbovePrice`, 'The floor cannot be above the asking price.') });
  }
  return issues;
}

function stopIssues(draft: ShipmentDraft, now: number, tr: Tr): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (draft.stops.length < 2) {
    issues.push({ field: 'stops', message: tr(`${K}.needsTwoStops`, 'A load needs a pickup and a delivery.') });
    return issues;
  }

  let previous: number | null = null;
  draft.stops.forEach((stop, i) => {
    if (!stop.locationId) issues.push({ field: `stops[${i}].locationId`, message: tr(`${K}.stopNoLocation`, 'Stop {{n}} has no location.', { n: i + 1 }) });
    const from = parseLocal(stop.from);
    if (from === null) {
      issues.push({ field: `stops[${i}].from`, message: tr(`${K}.stopNoDate`, 'Stop {{n}} has no date and time.', { n: i + 1 }) });
      return;
    }
    if (from < now) issues.push({ field: `stops[${i}].from`, message: tr(`${K}.stopInPast`, 'Stop {{n}} is in the past.', { n: i + 1 }) });
    const to = parseLocal(stop.to);
    if (to !== null && to <= from) {
      issues.push({ field: `stops[${i}].to`, message: tr(`${K}.stopClosesBeforeOpens`, 'Stop {{n}} closes before it opens.', { n: i + 1 }) });
    }
    if (previous !== null && from < previous) {
      issues.push({ field: `stops[${i}].from`, message: tr(`${K}.stopBeforePrevious`, 'Stop {{n}} is scheduled before stop {{prev}}.', { n: i + 1, prev: i }) });
    }
    previous = from;
  });
  return issues;
}

function lineIssues(draft: ShipmentDraft, tr: Tr): DraftIssue[] {
  if (allLines(draft).length === 0) {
    return [{ field: 'lines', message: tr(`${K}.addProduct`, 'Add at least one product.') }];
  }
  const issues: DraftIssue[] = [];
  // Paths are `stops[i].lines[j].field`, matching the gateway's `missing[]`
  // exactly — the whole point of this file agreeing with the publish gate.
  draft.stops.forEach((stop, i) => {
    stop.lines.forEach((line, j) => {
      // Whole sentences per locale rather than a "Stop 1 line 2" prefix: the
      // Greek names the line before the stop.
      const where = { stop: i + 1, line: j + 1 };
      const path = `stops[${i}].lines[${j}]`;
      // A line picked from the bundle always has one, so this only fires on a
      // line prefilled from an order whose product was never matched to the
      // Product Master. The gateway's schema requires a real id, so without this
      // check the shipper would fill in eleven cards and be refused at the end.
      if (!line.productId) {
        issues.push({ field: `${path}.productId`, message: tr(`${K}.lineNeedsProduct`, 'Stop {{stop}} line {{line}} needs a product from your Product Master.', where) });
      }
      if (!(line.qty > 0)) {
        issues.push({ field: `${path}.qty`, message: tr(`${K}.lineNeedsQty`, 'Stop {{stop}} line {{line}} needs a quantity.', where) });
      }
      if (!(line.weight > 0)) {
        issues.push({ field: `${path}.weight`, message: tr(`${K}.lineNeedsWeight`, 'Stop {{stop}} line {{line}} needs a weight.', where) });
      }
    });
  });
  return issues;
}

/** Kilos, so a load mixing tonnes and kilos still balances against itself. */
const toKg = (weight: number, unit: WeightUnit): number => (unit === 'T' ? weight * 1000 : weight);

/**
 * Whether this is a direct run whose drop lines the gateway will supply.
 *
 * The mirror image of `autoPairLines` on the gateway, condition for condition:
 * exactly two stops, and not one drop line anywhere. Such a load says "collect
 * this in Athens, deliver it in Milan" by saying only the first half, which is
 * what the two-stop cards are built to collect — so it is balanced by
 * construction and the allocation rules have nothing to check.
 *
 * Add a third stop, or write a single drop, and the shipper is stating an
 * allocation instead of relying on the implicit one; from then on every rule
 * applies.
 */
export function isDirectRunAwaitingPairing(draft: ShipmentDraft): boolean {
  return (
    draft.stops.length === 2 &&
    (draft.stops[0]?.lines.length ?? 0) > 0 &&
    !allLines(draft).some((line) => line.action === 'drop')
  );
}

/**
 * The allocation rules, mirrored from the gateway's own publish gate.
 *
 * Three of them, and each catches what the others let through: BALANCE is the
 * end state (collected equals delivered, per unit and by weight), ORDER is per
 * product (no SKU delivered at or before the stop that collects it), and RUNNING
 * LOAD walks the itinerary (never delivering more than has been collected so
 * far, even when the totals agree at the end).
 *
 * Mirrored rather than left to the server for the reason in the file header:
 * this is an affordance, so the shipper is told why Continue is grey instead of
 * discovering it a round trip later. The gateway re-derives all three and wins
 * any disagreement.
 *
 * The wizard's order-total rule (C12) is absent here for the same reason it is
 * absent there: it needs the ERP order records, which this file never sees.
 */
function allocationIssues(draft: ShipmentDraft, tr: Tr): DraftIssue[] {
  const issues: DraftIssue[] = [];
  // The unit's wire code in English, exactly as it has always read; a word in
  // the other locales.
  const unitName = (unit: string) => tr(`${K}.unitName.${unit}`, unit);
  const lines = allLines(draft);
  if (lines.length === 0) return issues;

  // A direct run states only its picks — see "Why the lines are not mirrored
  // here" above — and the gateway's `autoPairLines` supplies the drops. Checking
  // balance before that happens would refuse every ordinary two-stop load for
  // delivering nothing, so the implicit pairing is honoured here exactly as the
  // gateway honours it: same two conditions, same meaning.
  if (isDirectRunAwaitingPairing(draft)) return issues;

  draft.stops.forEach((stop, i) => {
    if (stop.lines.length === 0) {
      issues.push({
        field: `stops[${i}].lines`,
        message: tr(`${K}.stopNoCargo`, 'Stop {{n}} has no cargo — say what happens there, or remove the stop.', { n: i + 1 }),
      });
    }
  });

  const picked = new Map<string, number>();
  const dropped = new Map<string, number>();
  let pickedKg = 0;
  let droppedKg = 0;
  for (const line of lines) {
    const target = line.action === 'pick' ? picked : dropped;
    target.set(line.unit, (target.get(line.unit) ?? 0) + line.qty);
    if (line.action === 'pick') pickedKg += toKg(line.weight, line.wUnit);
    else droppedKg += toKg(line.weight, line.wUnit);
  }
  for (const unit of new Set([...picked.keys(), ...dropped.keys()])) {
    const p = picked.get(unit) ?? 0;
    const d = dropped.get(unit) ?? 0;
    if (p !== d) {
      issues.push({
        field: 'lines',
        message: tr(
          `${K}.unbalancedQty`,
          '{{picked}} {{unit}} collected but {{dropped}} delivered — everything picked up has to be dropped off somewhere.',
          { picked: p, unit: unitName(unit), dropped: d },
        ),
      });
    }
  }
  if (Math.abs(pickedKg - droppedKg) >= 0.01) {
    issues.push({
      field: 'lines',
      message: tr(`${K}.unbalancedWeight`, '{{picked}} kg collected but {{dropped}} kg delivered.', {
        picked: pickedKg,
        dropped: droppedKg,
      }),
    });
  }

  const firstPick = new Map<string, number>();
  draft.stops.forEach((stop, i) => {
    for (const line of stop.lines) {
      if (line.action === 'pick' && !firstPick.has(line.productId)) firstPick.set(line.productId, i);
    }
  });
  draft.stops.forEach((stop, i) => {
    stop.lines.forEach((line, j) => {
      if (line.action !== 'drop') return;
      const at = firstPick.get(line.productId);
      if (at === undefined) {
        issues.push({
          field: `stops[${i}].lines[${j}]`,
          message: tr(`${K}.dropNeverCollected`, 'Stop {{n}} delivers a product the load never collects.', { n: i + 1 }),
        });
      } else if (i <= at) {
        issues.push({
          field: `stops[${i}].lines[${j}]`,
          message: tr(
            `${K}.dropBeforePick`,
            'Stop {{n}} delivers a product that is not collected until stop {{at}}.',
            { n: i + 1, at: at + 1 },
          ),
        });
      }
    });
  });

  const running = new Map<string, number>();
  const reported = new Set<string>();
  draft.stops.forEach((stop, i) => {
    for (const line of stop.lines) {
      running.set(line.unit, (running.get(line.unit) ?? 0) + (line.action === 'pick' ? line.qty : -line.qty));
    }
    for (const [unit, carried] of running) {
      if (carried < 0 && !reported.has(unit)) {
        reported.add(unit);
        issues.push({
          field: `stops[${i}].lines`,
          message: tr(`${K}.negativeLoad`, 'After stop {{n}} the truck would be carrying {{carried}} {{unit}}.', {
            n: i + 1,
            carried,
            unit: unitName(unit),
          }),
        });
      }
    }
  });

  return issues;
}

/**
 * What stops the load being SAVED as a draft.
 *
 * The itinerary and the cargo, and nothing else - the same bar the gateway's
 * `evaluateDraftGate` applies and the same one the core API's step 1 enforces.
 * A truck, a carrier and a price are all absent from this list on purpose: a
 * draft is a work in progress, and a Save button that refused one would lose the
 * work it exists to keep.
 */
export function saveIssues(draft: ShipmentDraft, now: number = Date.now(), tr: Tr = englishTr): DraftIssue[] {
  return [...stopIssues(draft, now, tr), ...lineIssues(draft, tr), ...allocationIssues(draft, tr)];
}

/**
 * What stops the load going to the carrier.
 *
 * Everything `saveIssues` checks, plus the three things publishing needs and a
 * draft does not. Kept separate rather than expressed as one list with
 * severities because the two buttons ask different questions, and a single list
 * would inevitably be read by whichever button was written last.
 */
export function sendIssues(draft: ShipmentDraft, tr: Tr = englishTr): DraftIssue[] {
  return [
    ...(draft.vehicleTypeIds.length === 0
      ? [{ field: 'vehicleTypeIds', message: tr(`${K}.chooseTruck`, 'Choose the truck type.') }]
      : []),
    ...broadcastIssues(draft, tr),
    ...pricingIssues(draft, tr),
    // A real asking price, even on a negotiable load: MYVAGON's own step 3
    // refuses one without a figure, so `pricingIssues` - which allows a blank
    // price on a negotiable load - is not enough to send.
    ...(draft.pricing.startingPrice && draft.pricing.startingPrice > 0
      ? []
      : [{ field: 'pricing.startingPrice', message: tr(`${K}.setPrice`, 'Set an asking price.') }]),
  ];
}

/** Everything standing between this draft and a publish. Empty means ready to send. */
export function blockingIssues(draft: ShipmentDraft, now: number = Date.now(), tr: Tr = englishTr): DraftIssue[] {
  return [...saveIssues(draft, now, tr), ...sendIssues(draft, tr)];
}

/**
 * What stops a load being copied into a scheduled batch.
 *
 * Deliberately NOT `blockingIssues`. That function refuses a stop in the past,
 * which is right for publishing one load and wrong here: a batch replaces every
 * date it copies, so refusing a template because the load it came from has
 * already shipped would refuse the entire point of the feature. The gateway's
 * own schedule gate makes the same distinction — it grades the projected first
 * load as of its posting time, never the template.
 *
 * What is left is everything the new dates cannot fix: where the load goes, who
 * it goes to, what carries it and what it costs. Those are settled once and
 * copied verbatim, so a template missing any of them produces a batch refused
 * once per load it owes.
 *
 * Checked before the drawer opens rather than after the shipper has filled in
 * five fields, because the fix is not in the drawer — it is back in the
 * conversation.
 */
export function schedulableIssues(draft: ShipmentDraft, tr: Tr = englishTr): DraftIssue[] {
  return [
    ...broadcastIssues(draft, tr),
    // Mirrors the gateway's schedule gate: a batch posts from the queue, which
    // cannot take a load onto the marketplace, so copies of a public load would
    // all fail at posting time. Said here, before the drawer opens.
    ...(draft.broadcast.channels.includes('public')
      ? [{
          field: 'broadcast.channels',
          message: tr(
            `${K}.publicNotSchedulable`,
            'Copies of a public load cannot be scheduled yet. Switch to Private and choose carriers, or post this one load publicly now.',
          ),
        }]
      : []),
    ...(draft.vehicleTypeIds.length === 0
      ? [{ field: 'vehicleTypeIds', message: tr(`${K}.chooseTruckAtLeastOne`, 'Choose at least one truck type.') }]
      : []),
    ...pricingIssues(draft, tr),
    // A batch needs a real asking price even on a negotiable load: MYVAGON's own
    // step 3 refuses one without a figure, so `pricingIssues` alone — which
    // allows a blank price on a negotiable load — is not enough here.
    ...(draft.pricing.startingPrice && draft.pricing.startingPrice > 0
      ? []
      : [{ field: 'pricing.startingPrice', message: tr(`${K}.setPrice`, 'Set an asking price.') }]),
  ];
}

/** Real, but not blocking — shown on the preview so nothing is a surprise. */
export function draftWarnings(draft: ShipmentDraft, tr: Tr = englishTr): string[] {
  const warnings: string[] = [];
  const pickup = pickupStop(draft);
  const delivery = deliveryStop(draft);

  if (pickup && delivery && pickup.locationId && pickup.locationId === delivery.locationId) {
    warnings.push(tr('vagonai.review.warnings.samePickupDelivery', 'Pickup and delivery are the same location.'));
  }
  if (draft.requireTracking) {
    warnings.push(
      tr(
        'vagonai.review.warnings.trackingRequired',
        'Live tracking is required, so the carrier cannot mark this trip executed manually.',
      ),
    );
  }
  return warnings;
}


/** QA / debug: exact save-gate field paths that keep Save disabled. */
export function describeSaveBlockers(
  draft: ShipmentDraft,
  now: number = Date.now(),
  tr: Tr = englishTr,
): Array<{ field: string; message: string }> {
  return saveIssues(draft, now, tr).map((issue) => ({ field: issue.field, message: issue.message }));
}
