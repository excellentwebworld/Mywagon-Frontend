/**
 * Parse obvious cargo qty/weight hints from a chat message so the open
 * create-shipment review card can update immediately — without waiting for the
 * model to call prepare_shipment again.
 */
import type { DraftLine, QtyUnit, ShipmentDraft, WeightUnit } from './createShipmentDraft';

export interface CargoChatHints {
  qty?: number;
  unit?: QtyUnit;
  weight?: number;
  wUnit?: WeightUnit;
}

/**
 * Pull qty + pallet/unit and weight figures out of free text.
 *
 * Examples that must match:
 * - "we are shipping 2 EUR pallets"
 * - "2 pallets"
 * - "Drill machine weighs 250 kg"
 * - "8 tonnes" / "1.5 tons"
 */
export function parseCargoHintsFromMessage(text: string): CargoChatHints | null {
  const raw = (text || '').trim();
  if (!raw) return null;

  const hints: CargoChatHints = {};

  const qtyMatch = raw.match(
    /(\d+(?:[.,]\d+)?)\s*(?:EUR\s*|Euro\s*|US\s*)?pallets?\b/i,
  );
  if (qtyMatch) {
    const qty = Number(String(qtyMatch[1]).replace(',', '.'));
    if (Number.isFinite(qty) && qty > 0) {
      hints.qty = qty;
      hints.unit = 'EUR_PALLET';
    }
  }

  // Bare "N units" / "N boxes" when no pallet figure was found.
  if (hints.qty == null) {
    const unitMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:units?|boxes?|pcs|pieces)\b/i);
    if (unitMatch) {
      const qty = Number(String(unitMatch[1]).replace(',', '.'));
      if (Number.isFinite(qty) && qty > 0) {
        hints.qty = qty;
        hints.unit = 'UNIT';
      }
    }
  }

  const kgMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kgs|kilograms?)\b/i);
  if (kgMatch) {
    const weight = Number(String(kgMatch[1]).replace(',', '.'));
    if (Number.isFinite(weight) && weight > 0) {
      hints.weight = weight;
      hints.wUnit = 'KG';
    }
  } else {
    const tonneMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:t|tonnes?|tons?)\b/i);
    if (tonneMatch) {
      const weight = Number(String(tonneMatch[1]).replace(',', '.'));
      if (Number.isFinite(weight) && weight > 0) {
        hints.weight = weight;
        hints.wUnit = 'T';
      }
    }
  }

  if (hints.qty == null && hints.weight == null) return null;
  return hints;
}

function patchLine(line: DraftLine, hints: CargoChatHints): DraftLine {
  const next = { ...line };
  if (hints.qty != null && hints.qty > 0 && !(line.qty > 0)) {
    next.qty = hints.qty;
    if (hints.unit) next.unit = hints.unit;
  }
  if (hints.weight != null && hints.weight > 0 && !(line.weight > 0)) {
    next.weight = hints.weight;
    if (hints.wUnit) next.wUnit = hints.wUnit;
  }
  return next;
}

/**
 * Merge parsed chat cargo hints into the open draft.
 *
 * Fills the first pick line with missing/zero qty or weight, and mirrors the
 * same numbers onto drop lines that share its orderLineId / productId.
 */
export function applyCargoHintsToDraft(draft: ShipmentDraft, hints: CargoChatHints): ShipmentDraft {
  if (!hints.qty && !hints.weight) return draft;

  let target: { orderLineId: string | null; productId: string; action: 'pick' } | null = null;
  for (const stop of draft.stops) {
    for (const line of stop.lines) {
      if (line.action !== 'pick') continue;
      const needsQty = hints.qty != null && !(line.qty > 0);
      const needsWeight = hints.weight != null && !(line.weight > 0);
      if (needsQty || needsWeight) {
        target = { orderLineId: line.orderLineId, productId: line.productId, action: 'pick' };
        break;
      }
    }
    if (target) break;
  }
  if (!target) return draft;

  const key = target;
  return {
    ...draft,
    stops: draft.stops.map((stop) => ({
      ...stop,
      lines: stop.lines.map((line) => {
        const sameOrder =
          key.orderLineId && line.orderLineId && line.orderLineId === key.orderLineId;
        const sameProduct =
          !key.orderLineId && key.productId && line.productId === key.productId;
        if (sameOrder || sameProduct) return patchLine(line, hints);
        return line;
      }),
    })),
  };
}

/**
 * Patch a flow_context seed in place (bundle.draft) so ShipmentReviewCard's
 * mergeSeedIntoDraft effect can enable Save draft without a tool round-trip.
 */
export function applyCargoHintsToSeedDraft<T extends {
  stops: Array<{
    lines: Array<{
      action: 'pick' | 'drop';
      qty: number;
      unit: QtyUnit;
      weight: number;
      wUnit: WeightUnit;
      productId: string;
      orderLineId: string | null;
    }>;
  }>;
}>(seed: T, hints: CargoChatHints): T {
  // Reuse draft logic via a thin adapter.
  const asDraft: ShipmentDraft = {
    customerReference: null,
    stops: seed.stops.map((s) => ({
      locationId: '',
      from: '',
      to: null,
      lines: s.lines.map((l) => ({
        productId: l.productId,
        action: l.action,
        qty: l.qty,
        unit: l.unit,
        weight: l.weight,
        wUnit: l.wUnit,
        orderId: null,
        orderLineId: l.orderLineId,
        customerId: null,
      })),
    })),
    vehicleTypeIds: [],
    vehicleCategoryIds: [],
    broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
    pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    requireTracking: false,
    responseWindow: '48h',
    settlement: 'direct',
    bulk: { mode: 'single' },
    trackingOrderIds: [],
  };
  const patched = applyCargoHintsToDraft(asDraft, hints);
  return {
    ...seed,
    stops: seed.stops.map((stop, si) => ({
      ...stop,
      lines: stop.lines.map((line, li) => {
        const next = patched.stops[si]?.lines[li];
        if (!next) return line;
        return {
          ...line,
          qty: next.qty,
          unit: next.unit,
          weight: next.weight,
          wUnit: next.wUnit,
        };
      }),
    })),
  };
}
