/**
 * Apply a SelectionCards product pick (+ optional cargo capture) to the open
 * create-shipment draft seed so Save-as-draft can enable without waiting for
 * the model to refresh prepare_shipment.
 *
 * Greenfield: shipper taps a product card and fills qty/weight on the capture
 * form. That used to only go to the gateway; the review card kept empty lines
 * and Save stayed disabled (MS3-332).
 */
import type { CargoCapture, FlowDraftLine, FlowDraftSeed, FlowDraftStop } from '../../hooks/useChat';
import { ensureStopSchedules } from './applyLocationChoiceToDraft';

/** `product:97` → `97`; bare digits pass through; anything else → null. */
export function parseProductOptionId(optionId: string): string | null {
  const raw = (optionId || '').trim();
  if (!raw) return null;
  const m = raw.match(/^product:(\d+)$/i);
  if (m) return m[1]!;
  if (/^\d+$/.test(raw)) return raw;
  return null;
}

function mapQtyUnit(raw: string | undefined | null): FlowDraftLine['unit'] {
  const u = (raw || '').trim().toLowerCase();
  if (!u) return 'UNIT';
  if (u.includes('pal') || u === 'eur_pallet' || u === 'eur-pallet') return 'EUR_PALLET';
  return 'UNIT';
}

function mapWeightUnit(raw: string | undefined | null): FlowDraftLine['wUnit'] {
  const u = (raw || '').trim().toLowerCase();
  if (u === 't' || u === 'ton' || u === 'tons' || u === 'tonne' || u === 'tonnes') return 'T';
  return 'KG';
}

const blankSeedStop = (): FlowDraftStop => ({
  locationId: '',
  locationName: null,
  from: '',
  to: null,
  lines: [],
});

function blankLine(action: FlowDraftLine['action']): FlowDraftLine {
  return {
    productId: '',
    productName: null,
    action,
    qty: 0,
    unit: 'UNIT',
    weight: 0,
    wUnit: 'KG',
    sourceUnit: null,
    orderId: null,
    orderLineId: null,
    customerId: null,
  };
}

function buildLine(
  action: FlowDraftLine['action'],
  productId: string,
  productName: string | null,
  cargo?: CargoCapture | null,
  prior?: FlowDraftLine | null,
): FlowDraftLine {
  const base = prior ?? blankLine(action);
  const qty = cargo && Number.isFinite(cargo.qty) && cargo.qty > 0 ? cargo.qty : base.qty;
  const weight =
    cargo && Number.isFinite(cargo.weight) && cargo.weight > 0 ? cargo.weight : base.weight;
  return {
    ...base,
    productId,
    productName: productName != null && productName !== '' ? productName : base.productName,
    action,
    qty,
    unit: cargo?.unit ? mapQtyUnit(cargo.unit) : base.unit || 'UNIT',
    weight,
    wUnit: cargo?.weight_unit ? mapWeightUnit(cargo.weight_unit) : base.wUnit || 'KG',
  };
}

/**
 * Write the chosen product onto pickup (pick) and delivery (drop) lines.
 * Reuses an empty first line on each stop when present; otherwise appends.
 * Then refreshes stop schedules when locations already exist.
 */
export function applyProductChoiceToDraft(
  draft: FlowDraftSeed,
  productId: string,
  productName?: string | null,
  cargo?: CargoCapture | null,
  now: Date = new Date(),
): FlowDraftSeed {
  const id = (productId || '').trim();
  if (!id) return draft;

  const stops = draft.stops.map((s) => ({
    ...s,
    lines: s.lines.map((l) => ({ ...l })),
  }));
  while (stops.length < 2) stops.push(blankSeedStop());

  const patchStop = (stop: FlowDraftStop, action: FlowDraftLine['action']): FlowDraftStop => {
    const lines = [...stop.lines];
    const emptyIdx = lines.findIndex((l) => l.action === action && !String(l.productId || '').trim());
    const sameIdx = lines.findIndex((l) => l.action === action && String(l.productId) === id);
    const idx = sameIdx >= 0 ? sameIdx : emptyIdx >= 0 ? emptyIdx : -1;
    const nextLine = buildLine(action, id, productName ?? null, cargo, idx >= 0 ? lines[idx] : null);
    if (idx >= 0) lines[idx] = nextLine;
    else lines.push(nextLine);
    return { ...stop, lines };
  };

  stops[0] = patchStop(stops[0]!, 'pick');
  stops[stops.length - 1] = patchStop(stops[stops.length - 1]!, 'drop');

  return ensureStopSchedules({ ...draft, stops }, now);
}
