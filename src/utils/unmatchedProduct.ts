/**
 * A cargo line whose order names a product that is not in the Product Master.
 *
 * QA 2026-10-10 (Bug 3): a draft made from an order whose product was never
 * added to the Product Master (ORD4 -> SID-116398) opened with "Select
 * product..." and "Stop 1: Add at least one product line". The order's product
 * name was right there, and the wizard dropped it. These helpers keep that name
 * and look for a Product Master entry it plainly means, so the line can say what
 * is wrong and offer "Use <match>" or "+ Create <name>".
 */

interface OrderLineLike {
  id?: string | number | null;
  productSkuId?: string | number | null;
  productName?: string | null;
  sku?: string | null;
}

interface OrderLike {
  lines?: OrderLineLike[] | null;
}

interface CargoLineLike {
  productId?: string | number | null;
  productName?: string | null;
  orderLineId?: string | number | null;
}

export interface ProductMasterEntry {
  id: string | number;
  name?: string | null;
  number?: string | null;
  sku_name?: string | null;
  active?: boolean;
}

/**
 * The product the order names for this line when it has no Product Master
 * product, or null. The line's own saved name wins; failing that, the order line
 * it came from; failing that, the order's only unmapped line.
 */
export function unmatchedProductName(line: CargoLineLike | null | undefined, order: OrderLike | null | undefined): string | null {
  if (!line || line.productId) return null;
  const own = (line.productName ?? '').trim();
  if (own) return own;
  const unmapped = (order?.lines ?? []).filter((l) => !l.productSkuId && (l.productName ?? '').trim());
  if (line.orderLineId != null && line.orderLineId !== '') {
    const linked = unmapped.find((l) => l.id != null && String(l.id) === String(line.orderLineId));
    if (linked) return String(linked.productName).trim();
  }
  return unmapped.length === 1 ? String(unmapped[0]!.productName).trim() : null;
}

/** Lower case, no accents, punctuation as spaces: "Γάλα  1L" and "gala-1l" compare. */
export function normalizeProductName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * The one active Product Master entry the order's name plainly means, or null.
 *
 * Exact after normalizing (name or SKU code) first; otherwise one entry whose
 * name contains the order's name or the other way round, on names of at least
 * four characters. Two candidates is a guess, not a match, so it returns null
 * and the shipper picks.
 */
export function findProductMasterMatch<T extends ProductMasterEntry>(name: string | null | undefined, skus: readonly T[]): T | null {
  const needle = normalizeProductName(name);
  if (!needle) return null;
  const live = skus.filter((s) => s && s.active !== false);
  const keys = (s: T) => [s.name, s.sku_name, s.number].map(normalizeProductName).filter(Boolean);
  const exact = live.filter((s) => keys(s).includes(needle));
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  if (needle.length < 4) return null;
  const near = live.filter((s) => {
    const n = normalizeProductName(s.name ?? s.sku_name);
    return n.length >= 4 && (n.includes(needle) || needle.includes(n));
  });
  return near.length === 1 ? near[0]! : null;
}

/**
 * A weight as the number the wizard's weight box takes: "240 kg" -> "240",
 * "1.234,5" -> "1234.5", 40 -> "40". Empty when there is no number in it.
 *
 * QA retest #2: the Product Master's "240 kg" went into the line as-is. The
 * number input rejected it ("cannot be parsed") and showed an empty box, while
 * the Load Balance parsed it as 240 - two different weights on one screen.
 */
export function numericWeight(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? String(value) : '';
  let text = String(value).trim().replace(/[\s']/g, '');
  const match = text.match(/[-+]?[\d.,]+/);
  if (!match) return '';
  text = match[0];
  // "1.234,5" and "1,234.5": the last separator is the decimal one.
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
  else text = text.replace(/,/g, '');
  const n = Number.parseFloat(text);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

interface PickedLine {
  orderId?: string | number | null;
  qty?: string | number | null;
  unit?: string | null;
  weight?: string | number | null;
  wtUnit?: string | null;
}

interface PickedSku {
  id: string | number;
  name?: string | null;
  sku_name?: string | null;
  unit?: string | null;
  weight?: string | number | null;
}

/**
 * The cargo-line change for picking a Product Master product the order line
 * does not name ("Use <match>", "+ Create <name>", or a pick from the list).
 *
 * The order's quantities stay: a line that came from an order keeps its own
 * quantity, unit and weight, and the product's default weight is only a
 * fallback for a line with none (QA retest #2: the order's 40 kg became the
 * product's "240 kg"). Units are returned raw; the caller normalizes them.
 */
export function productPickPatch(line: PickedLine | null | undefined, sku: PickedSku) {
  const fromOrder = line?.orderId != null && String(line.orderId) !== '';
  const lineWeight = numericWeight(line?.weight);
  const lineQty = line?.qty != null && String(line.qty).trim() !== '' ? String(line.qty) : '';
  return {
    productId: String(sku.id),
    productName: sku.name || sku.sku_name || 'Product',
    orderLineId: '',
    qty: lineQty,
    unit: (fromOrder && line?.unit) || sku.unit || line?.unit || '',
    weight: lineWeight || numericWeight(sku.weight),
    wtUnit: line?.wtUnit || '',
  };
}
