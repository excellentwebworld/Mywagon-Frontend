/**
 * MS3-334 — seed create-shipment FlowDraftSeed from an ERP order so sticky
 * Create draft can enable Save (same applyLocationChoiceToDraft /
 * ensureStopSchedules path as MS3-332).
 */
import type { FlowDraftSeed } from '../../hooks/useChat';
import type { ErpOrder } from '../ErpOrders/types';
import type { LocationItem } from '../../context/AppContext';
import {
  applyLocationChoiceToDraft,
  ensureStopSchedules,
  type LocationSlot,
} from './applyLocationChoiceToDraft';

export type ErpDraftLocationSeed = {
  orderId: string;
  orderReference: string;
  shipFrom: string;
  shipTo: string;
  pickup?: { locationId: string; locationName: string };
  delivery?: { locationId: string; locationName: string };
};

function norm(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function locationIdOf(item: LocationItem): string {
  const raw = String(item.id || '').trim();
  const digits = raw.match(/(\d+)/);
  return digits ? digits[1]! : raw;
}

/** Match ship-from / ship-to text against the address book (name, city, or code). */
export function matchLocationByName(
  hint: string,
  book: LocationItem[],
  slot: LocationSlot,
): LocationItem | null {
  const q = norm(hint);
  if (!q || !book?.length) return null;
  const roleOk = (l: LocationItem) => {
    if (slot === 'pickup') return l.role === 'pickup' || l.role === 'both';
    return l.role === 'delivery' || l.role === 'both';
  };
  const scored = book
    .filter(roleOk)
    .map((l) => {
      const name = norm(l.name);
      const city = norm(l.city);
      const code = norm(l.code);
      let score = 0;
      if (name && (name === q || q.includes(name) || name.includes(q))) score += 3;
      if (city && (city === q || q.includes(city) || city.includes(q))) score += 2;
      if (code && (code === q || q.includes(code))) score += 2;
      return { l, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  // MS3-413: two sites that fit the wording equally well are a question for the shipper, never a silent pick.
  if (scored.length > 1 && scored[1]!.score === scored[0]!.score) return null;
  return scored[0]?.l ?? null;
}

export function buildErpDraftSeedFromOrder(
  order: Pick<
    ErpOrder,
    | 'id'
    | 'orderReference'
    | 'shipFrom'
    | 'shipTo'
    | 'originLocationId'
    | 'destLocationId'
  >,
  book: LocationItem[] = [],
): ErpDraftLocationSeed {
  const seed: ErpDraftLocationSeed = {
    orderId: String(order.id),
    orderReference: order.orderReference,
    shipFrom: order.shipFrom || '',
    shipTo: order.shipTo || '',
  };

  if (order.originLocationId != null) {
    seed.pickup = {
      locationId: String(order.originLocationId),
      locationName: order.shipFrom || `Location ${order.originLocationId}`,
    };
  } else if (order.shipFrom) {
    const hit = matchLocationByName(order.shipFrom, book, 'pickup');
    if (hit) seed.pickup = { locationId: locationIdOf(hit), locationName: hit.name };
  }

  if (order.destLocationId != null) {
    seed.delivery = {
      locationId: String(order.destLocationId),
      locationName: order.shipTo || `Location ${order.destLocationId}`,
    };
  } else if (order.shipTo) {
    const hit = matchLocationByName(order.shipTo, book, 'delivery');
    if (hit) seed.delivery = { locationId: locationIdOf(hit), locationName: hit.name };
  }

  return seed;
}

/** Prompt that names ERP order + known location ids so one-shot can fill the card. */
export function buildEnrichedDraftPrompt(seeds: ErpDraftLocationSeed[]): string {
  const one = (s: ErpDraftLocationSeed): string => {
    const parts = [
      `Create a complete shipment draft from unplanned ERP order ${s.orderReference} (order id ${s.orderId}).`,
      'Use one-shot draft creation.',
    ];
    if (s.pickup) {
      parts.push(`Pickup location id ${s.pickup.locationId} (${s.pickup.locationName}).`);
    } else if (s.shipFrom) {
      parts.push(
        `Pickup site name on the order: "${s.shipFrom}" (resolve to an address-book location id; do not invent).`,
      );
    }
    if (s.delivery) {
      parts.push(`Delivery location id ${s.delivery.locationId} (${s.delivery.locationName}).`);
    } else if (s.shipTo) {
      parts.push(
        `Delivery site name on the order: "${s.shipTo}" (resolve to an address-book location id; do not invent).`,
      );
    }
    parts.push(
      'If stop schedules are missing or in the past, use future windows (pickup tomorrow 09:00, delivery day-after 17:00).',
      'Do not invent master data.',
    );
    return parts.join(' ');
  };
  if (seeds.length === 1) {
    const s = seeds[0]!;
    // REGATE7-fail: sticky single must short-circuit to oneshot (no Save-as-draft UI).
    // SEC-09: what triggers it is the `forceTool` the caller sends with this
    // text (`buildStickyCreateForceTool` -> create_oneshot_draft_from_order,
    // order_id as a string); the gateway stops honouring the marker/sentence.
    // They stay only for gateways that have not deployed that change yet.
    return (
      `[[VAGON_STICKY_ONESHOT:${s.orderId}]] ` +
      one(s) +
      ` Call create_oneshot_draft_from_order with order_id "${s.orderId}" now. ` +
      `Do not call prepare_shipment or create_shipment. Do not ask for confirmation.`
    );
  }
  return seeds.map(one).join('\n') + '\nFor 2+ orders call create_homogeneous_batch_drafts once with all of these order ids, whatever lanes they are on (fire-and-forget batch). It creates one draft per lane: orders with the same pickup and delivery share one draft and one SID, and each other lane gets its own.';
}

export function applyErpSeedToFlowDraft(
  draft: FlowDraftSeed,
  seed: ErpDraftLocationSeed,
  now: Date = new Date(),
): FlowDraftSeed {
  // Fills only what the gateway left blank. The gateway built this draft from
  // the order itself, so a site it already set is the order's own; the seed is
  // there to close a gap, never to replace a site (QA retest #2, 2026-10-10).
  let next = draft;
  const first = next.stops[0];
  const last = next.stops.length > 1 ? next.stops[next.stops.length - 1] : undefined;
  if (seed.pickup?.locationId && !(first?.locationId ?? '').trim()) {
    next = applyLocationChoiceToDraft(
      next,
      'pickup',
      seed.pickup.locationId,
      seed.pickup.locationName,
      now,
    );
  }
  if (seed.delivery?.locationId && !(last?.locationId ?? '').trim()) {
    next = applyLocationChoiceToDraft(
      next,
      'delivery',
      seed.delivery.locationId,
      seed.delivery.locationName,
      now,
    );
  }
  next = ensureStopSchedules(next, now);
  if (seed.orderReference && !next.customerReference) {
    next = { ...next, customerReference: seed.orderReference };
  }
  return next;
}

/** The ERP order ids on a draft's cargo lines. */
function draftOrderIds(draft: FlowDraftSeed): Set<string> {
  const ids = new Set<string>();
  for (const stop of draft.stops ?? []) {
    for (const line of stop.lines ?? []) {
      if (line.orderId != null && String(line.orderId).trim()) ids.add(String(line.orderId).trim());
    }
  }
  return ids;
}

/**
 * The sticky-panel seed that belongs to THIS draft, or null.
 *
 * QA retest #2 (2026-10-10, HIGH): "Create a shipment from my order
 * QARET2-1010-ORD5" typed in chat built a card delivering to Sindos Industrial
 * Warehouse with Ref QARET-1010-ORD1. The seeds from an earlier sticky "Create
 * drafts" (ORD1 + ORD2) were still held, and this used to fall back to
 * `seeds[0]` whenever nothing matched - so ORD1's delivery and reference were
 * written onto ORD5's card. A seed now applies only to a draft carrying that
 * seed's own order (by id on the cargo lines, or by the exact reference); no
 * match means no seed.
 */
export function pickSeedForDraft(
  seeds: ErpDraftLocationSeed[],
  draft: FlowDraftSeed,
): ErpDraftLocationSeed | null {
  if (!seeds.length) return null;
  const ids = draftOrderIds(draft);
  if (ids.size > 0) {
    return seeds.find((s) => ids.has(String(s.orderId).trim())) ?? null;
  }
  const ref = (draft.customerReference || '').trim().toLowerCase();
  if (ref) {
    return seeds.find((s) => s.orderReference.trim().toLowerCase() === ref) ?? null;
  }
  return null;
}
