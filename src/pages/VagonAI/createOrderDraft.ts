/**
 * The draft the guided create-order form fills in, and the rules it checks it
 * against.
 *
 * One object, held for the length of the form, written by every input and sent
 * once at the end — the same shape as `createProductDraft.ts` beside it, and for
 * the same reason: the bundle arrived in one event, so there is no per-field
 * endpoint to call and no server state to keep in step.
 *
 * ## An order is not a load, and this file is where the difference is enforced
 *
 * There are no stops here, no truck type, no channel and no price. An order is a
 * commercial fact — a customer, a delivery date and a line per product, freight
 * the shipper has SOLD — and it moves nothing. Building a load from it is a
 * separate flow. If a field from `createShipmentDraft.ts` ever appears in this
 * file, something has been merged that should not have been.
 *
 * ## This validation is an affordance, not a gate
 *
 * Everything in `orderIssues` is re-derived server-side by `orderDraftSchema`,
 * which trusts neither this file nor the model. What it is for is telling the
 * shipper *before* they press Save, so the answer to "why is this disabled" is on
 * screen rather than one round trip away. If the two ever disagree the server
 * wins, and its `missing[]` names the field to go back to.
 *
 * Pure, and deliberately free of React so it can be reasoned about — and tested —
 * on its own.
 */
import type { OrderFlowBundle, OrderFlowProduct } from '../../hooks/useChat';
import { englishTr, type Tr } from './i18n';

/** Exactly the units a shipment's cargo line takes, spelled exactly the same way. */
export const ORDER_QTY_UNITS = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'] as const;
export const ORDER_WEIGHT_UNITS = ['Tonnes', 'Kgs'] as const;

export type OrderQtyUnit = (typeof ORDER_QTY_UNITS)[number];
export type OrderWeightUnit = (typeof ORDER_WEIGHT_UNITS)[number];

export interface OrderDraftLine {
  /**
   * The Product Master id, or null for a product typed by name.
   *
   * Null is legitimate — an order for something not in the catalog is real and
   * MYVAGON accepts a bare name. But the id is what a load built from this order
   * reuses as its cargo `product_id`, so the picker is the preferred path and the
   * form says so on the line that has none.
   */
  productId: string | null;
  productName: string;
  qty: number | null;
  unit: OrderQtyUnit;
  weight: number | null;
  weightUnit: OrderWeightUnit;
}

export interface OrderDraft {
  orderReference: string;
  erpReference: string | null;
  customerId: string | null;
  customerName: string;
  originLocationId: string | null;
  destLocationId: string | null;
  /** `YYYY-MM-DD`, exactly what a date input emits. No time and no zone. */
  shipDate: string | null;
  deliveryDate: string;
  notes: string | null;
  highPriority: boolean;
  orderValue: number | null;
  lines: OrderDraftLine[];
}

/**
 * A blank draft, seeded from the bundle's defaults.
 *
 * The order reference comes from `bundle.defaults` and never from a constant
 * here: the gateway picked it to miss every reference it could see, which is
 * something this file has no way to work out. It stays fully editable — it is the
 * shipper's own numbering.
 */
export function emptyOrderDraft(bundle: OrderFlowBundle): OrderDraft {
  return {
    orderReference: bundle.defaults.orderReference ?? '',
    erpReference: null,
    customerId: null,
    customerName: '',
    originLocationId: null,
    destLocationId: null,
    shipDate: null,
    deliveryDate: '',
    notes: null,
    highPriority: bundle.defaults.highPriority ?? false,
    orderValue: null,
    lines: [emptyOrderLine(bundle)],
  };
}

export function emptyOrderLine(bundle: OrderFlowBundle): OrderDraftLine {
  return {
    productId: null,
    productName: '',
    qty: null,
    unit: (bundle.defaults.qtyUnit as OrderQtyUnit) ?? 'EUR Pallets',
    weight: null,
    weightUnit: (bundle.defaults.weightUnit as OrderWeightUnit) ?? 'Kgs',
  };
}

/**
 * Maps a product's own recorded unit onto the line's fixed vocabulary.
 *
 * A product's packaging unit is free text ("Case", "Crate", "Each") and a line's
 * is a fixed list, so copying it across is how a case ends up counted as a
 * pallet. Mirrors `normalizeQtyUnit` in `constants/cargoUnits`, kept local so
 * this file stays pure and dependency-free.
 */
function mapQtyUnit(unit: string | undefined, fallback: OrderQtyUnit): OrderQtyUnit {
  if (!unit) return fallback;
  const key = unit.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const exact = ORDER_QTY_UNITS.find((option) => option.toLowerCase() === key);
  if (exact) return exact;
  if (key.includes('us') && key.includes('pallet')) return 'US Pallets';
  if (key.includes('pallet')) return 'EUR Pallets';
  if (key.includes('box') || key.includes('case') || key.includes('crate')) return 'Boxes';
  if (key.includes('bag')) return 'Big Bags';
  if (key.includes('each') || key.includes('piece') || key.includes('unit')) return 'Units';
  return fallback;
}

function mapWeightUnit(unit: string | undefined, fallback: OrderWeightUnit): OrderWeightUnit {
  if (!unit) return fallback;
  const key = unit.toLowerCase().trim();
  if (['t', 'ton', 'tons', 'tonne', 'tonnes'].includes(key)) return 'Tonnes';
  if (['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'g'].includes(key)) return 'Kgs';
  return fallback;
}

/**
 * Writes a chosen product onto a line, carrying the product's own defaults over.
 *
 * The weight is seeded as `weightPerUnit × qty` only when a quantity is already
 * set — the shipper is entering an order line, and a per-unit figure sitting in a
 * total-weight field is worse than a blank one. When there is no quantity yet the
 * unit is set and the weight is left for them.
 */
export function setLineProduct(line: OrderDraftLine, product: OrderFlowProduct): OrderDraftLine {
  const unit = mapQtyUnit(product.defaults?.unit, line.unit);
  const weightUnit = mapWeightUnit(product.defaults?.weightUnit, line.weightUnit);
  const perUnit = product.defaults?.weightPerUnit;
  const weight = line.weight ?? (perUnit && line.qty ? Number((perUnit * line.qty).toFixed(3)) : null);

  return { ...line, productId: product.id, productName: product.name, unit, weightUnit, weight };
}

/* -------------------------------------------------------------------------- *
 * Validation
 * -------------------------------------------------------------------------- */

export interface OrderIssue {
  /** The draft field path, matching the server's `missing[]` entries exactly. */
  field: string;
  message: string;
}

/**
 * The order ID the shipper has typed, if they have already used it.
 *
 * Compared case-insensitively and after trimming, because "ord-88" and "ORD-88 "
 * are the same reference to MYVAGON and it will refuse both. Returns the stored
 * spelling rather than a boolean so the warning can quote what they actually
 * have on file.
 */
export function referenceClashOf(draft: OrderDraft, bundle: OrderFlowBundle): string | null {
  const typed = draft.orderReference.trim().toLowerCase();
  if (!typed) return null;
  return bundle.existingReferences.find((reference) => reference.trim().toLowerCase() === typed) ?? null;
}

/**
 * Everything standing between this draft and a saved order. Empty means ready.
 *
 * Note what is NOT here: a past delivery date. Unlike a shipment stop, a
 * back-dated order is ordinary record-keeping — orders get entered late — so
 * refusing one would break the data entry this form exists to do. The server
 * agrees; see `ORDER_DATE_RULES.pastAllowed`.
 */
export function orderIssues(draft: OrderDraft, tr: Tr = englishTr): OrderIssue[] {
  const issues: OrderIssue[] = [];

  if (!draft.orderReference.trim()) {
    issues.push({
      field: 'orderReference',
      message: tr('vagonai.orderForm.issues.orderReferenceRequired', 'Give this order your own order ID.'),
    });
  }
  if (!draft.customerName.trim()) {
    issues.push({
      field: 'customerName',
      message: tr('vagonai.orderForm.issues.customerRequired', 'Choose the customer, or type their name.'),
    });
  }
  if (!draft.deliveryDate) {
    issues.push({ field: 'deliveryDate', message: tr('vagonai.orderForm.issues.deliveryDateRequired', 'Set the delivery date.') });
  }
  // Blamed on the ship date, not the delivery date: the delivery date is the one
  // the customer agreed to, so it is the ship date that has been typed wrong.
  if (draft.shipDate && draft.deliveryDate && draft.shipDate > draft.deliveryDate) {
    issues.push({
      field: 'shipDate',
      message: tr(
        'vagonai.orderForm.issues.shipAfterDelivery',
        'The ship date is after the delivery date. Goods cannot arrive before they leave.',
      ),
    });
  }
  if (draft.orderValue !== null && draft.orderValue < 0) {
    issues.push({
      field: 'orderValue',
      message: tr('vagonai.orderForm.issues.orderValueNegative', 'An order value cannot be negative.'),
    });
  }

  if (draft.lines.length === 0) {
    issues.push({ field: 'lines', message: tr('vagonai.orderForm.issues.linesRequired', 'Add at least one product line.') });
    return issues;
  }

  draft.lines.forEach((line, i) => {
    const params = { line: i + 1 };
    if (!line.productName.trim()) {
      issues.push({
        field: `lines[${i}].productName`,
        message: tr('vagonai.orderForm.issues.lineProductRequired', 'Line {{line}} needs a product.', params),
      });
    }
    if (!(line.qty && line.qty > 0)) {
      issues.push({
        field: `lines[${i}].qty`,
        message: tr('vagonai.orderForm.issues.lineQtyRequired', 'Line {{line}} needs a quantity.', params),
      });
    }
    if (!(line.weight && line.weight > 0)) {
      issues.push({
        field: `lines[${i}].weight`,
        message: tr('vagonai.orderForm.issues.lineWeightRequired', 'Line {{line}} needs a weight.', params),
      });
    }
  });

  return issues;
}

/** Real, but not blocking — shown on the form so nothing is a surprise. */
export function orderWarnings(draft: OrderDraft, bundle: OrderFlowBundle, tr: Tr = englishTr): string[] {
  const warnings: string[] = [];

  const clash = referenceClashOf(draft, bundle);
  if (clash) {
    warnings.push(
      tr(
        'vagonai.orderForm.warnings.referenceClash',
        'You already have an order with the ID "{{reference}}". MYVAGON will refuse a duplicate — change it.',
        { reference: clash },
      ),
    );
  }

  const unmatched = draft.lines.filter((line) => line.productName.trim() && !line.productId).length;
  if (unmatched > 0) {
    // The English is picked by count so the fallback reads exactly as before;
    // with a locale loaded, i18next picks `_one` / `_other` from `count` itself.
    warnings.push(
      tr(
        'vagonai.orderForm.warnings.unmatchedProducts',
        unmatched === 1
          ? '{{count}} line names a product that is not in your Product Master. The order still saves, but a load built from it will need those products added first.'
          : '{{count}} lines name a product that is not in your Product Master. The order still saves, but a load built from it will need those products added first.',
        { count: unmatched },
      ),
    );
  }

  if (!draft.originLocationId || !draft.destLocationId) {
    warnings.push(
      tr(
        'vagonai.orderForm.warnings.noSites',
        'No ship-from or ship-to site is set. That is fine on an order — the sites get settled when a load is built from it.',
      ),
    );
  }

  return warnings;
}

/**
 * The draft as `POST /chat/order-draft` takes it.
 *
 * Blanks become `null` rather than being dropped: the gateway's draft schema
 * marks them `nullish` precisely so a form store does not have to strip its own
 * nulls before posting, and a client that had to would eventually forget to.
 * `normalizeOrderDraft` on the other side collapses them into absences.
 */
export function serializeOrderDraft(draft: OrderDraft): Record<string, unknown> {
  return {
    orderReference: draft.orderReference.trim(),
    erpReference: draft.erpReference?.trim() || null,
    customerId: draft.customerId || null,
    customerName: draft.customerName.trim(),
    originLocationId: draft.originLocationId || null,
    destLocationId: draft.destLocationId || null,
    shipDate: draft.shipDate || null,
    deliveryDate: draft.deliveryDate,
    notes: draft.notes?.trim() || null,
    highPriority: draft.highPriority,
    orderValue: draft.orderValue,
    lines: draft.lines.map((line) => ({
      productId: line.productId || null,
      productName: line.productName.trim(),
      qty: line.qty,
      unit: line.unit,
      weight: line.weight,
      weightUnit: line.weightUnit,
    })),
  };
}
