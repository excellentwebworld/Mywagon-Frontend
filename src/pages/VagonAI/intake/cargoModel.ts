/**
 * The cargo step's rules, pure (CONTRACT.md §5.1 `cargo`, §5.4, §8.3, §20.4, §20.12). What is on screen is a list of ROWS the
 * shipper completes; what is posted is ONE `cargo` answer with every line. Nothing here reads a hook.
 *
 * A line's own `weightMode` / `weight` are authoritative (§20.4); the widget-level ones describe the first line only.
 * `derived` ⇒ read-only "Weight: 1200 kg (from the product)" with a Change link, and NO weight is posted (the gateway derives it);
 * `ask` ⇒ `[number][kg|tonnes]` (the ANSWER may say tonnes, the stored line is always kg); `pending_unit` ⇒ the number the
 * shipper said (`pendingWeight`) is there and the unit toggle is UNSELECTED until they choose (never guessed — the "2.5 → 2.5 kg" trap).
 * The answer replaces the stop's lines atomically (§20.12), so it is posted only when EVERY line is complete.
 */
import { EN_NUMBERS, formatInput, parseNumber, type NumberLocale } from './numberFormat';
import type { CargoLineSpec, CargoWidgetSpec, IntakeAnswerWire, LinePlausibility, QtyUnit, WeightMode, WeightUnit } from './contract';

export const QTY_UNITS: readonly QtyUnit[] = ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'];
export const WEIGHT_UNITS: readonly WeightUnit[] = ['Kgs', 'Tonnes'];
export const UNIT_KEY: Record<QtyUnit, string> = {
  'EUR Pallets': 'eurPallets', 'US Pallets': 'usPallets', Boxes: 'boxes', Units: 'units', 'Big Bags': 'bigBags',
};

export interface CargoRow {
  key?: string;
  productId: string | null; productLabel: string;
  /** The words the shipper used (`productQuery`), for the "which product?" line. */
  query: string;
  qty: string; unit: QtyUnit | null;
  /** What is in the weight box (text), and its unit. */
  weight: string; wUnit: WeightUnit | null;
  /** "Change" was pressed on a derived weight: the shipper types their own. */
  ownWeight: boolean;
  /** This line's own mode (§20.4). */
  mode: WeightMode;
  /** The line's weight in kg as the gateway has it (derived from the product / an order / typed earlier). */
  weightKg: number | null;
  plausibility: LinePlausibility | null;
  match: CargoLineSpec['productMatch'];
}
export type RowIssue = 'product' | 'qty' | 'unit' | 'weight' | 'wUnit';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
/** A number from the gateway, as text in the language's own habit (`1,5` in Greek) — so it reads back to the same number. */
const numText = (v: unknown, loc: NumberLocale = EN_NUMBERS): string => (typeof v === 'number' && Number.isFinite(v) ? formatInput(v, loc, 3) : '');
export const unitOf = (v: unknown): QtyUnit | null => (QTY_UNITS as readonly unknown[]).includes(v) ? (v as QtyUnit) : null;
const modeOf = (v: unknown): WeightMode | null => v === 'derived' || v === 'ask' || v === 'pending_unit' ? v : null;
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const unitOptionsOf = (spec: Pick<CargoWidgetSpec, 'unitOptions'>): QtyUnit[] => {
  const given = (spec.unitOptions ?? []).filter((u) => unitOf(u) !== null);
  return given.length > 0 ? given : [...QTY_UNITS];
};

/** The plausibility a line carries, or null when it is absent or malformed. `kgPerUnit` / `suggestKg` may be null. */
export function plausibilityOf(v: unknown): LinePlausibility | null {
  if (typeof v !== 'object' || v === null) return null;
  const p = v as Record<string, unknown>;
  if (p.kind !== 'low' && p.kind !== 'high' && p.kind !== 'odd') return null;
  const suggest = finite(p.suggestKg);
  return { kind: p.kind, kgPerUnit: finite(p.kgPerUnit), suggestKg: suggest !== null && suggest > 0 ? suggest : null };
}

/** The rows to start from: the gateway's partial lines, or one empty row. `unit` falls back to the only unit on offer. */
export function cargoRowsOf(spec: CargoWidgetSpec, loc: NumberLocale = EN_NUMBERS): CargoRow[] {
  const units = unitOptionsOf(spec);
  const lines: CargoLineSpec[] = spec.lines.length > 0 ? spec.lines : [{}];
  return lines.map((l, i) => {
    const mode = modeOf(l.weightMode) ?? (i === 0 ? modeOf(spec.weightMode) : null) ?? 'ask';
    const pending = l.pendingWeight && finite(l.pendingWeight.value) !== null ? numText(l.pendingWeight.value, loc) : '';
    const kg = finite(l.weight) ?? (i === 0 && mode === 'derived' ? finite(spec.derivedKg) : null);
    return {
      ...(typeof l.key === 'string' ? { key: l.key } : {}),
      productId: l.productId === null || l.productId === undefined || String(l.productId) === '' ? null : String(l.productId),
      productLabel: str(l.productLabel),
      query: str(l.productQuery),
      qty: numText(l.qty, loc),
      // A unit the shipper said that is not on offer (`unitPending`) is NOT guessed (§20.4).
      unit: l.unitPending === true ? null : (unitOf(l.unit) ?? (units.length === 1 ? units[0]! : null)),
      weight: mode === 'pending_unit' ? pending : numText(l.weight, loc),
      wUnit: mode === 'pending_unit' ? null : 'Kgs',
      ownWeight: false,
      mode,
      weightKg: kg,
      plausibility: plausibilityOf(l.plausibility),
      match: l.productMatch ?? null,
    };
  });
}

/** A positive number, one decimal mark (`.` or `,`), at most `decimals` of them. No thousands separator is guessed. */
export function parsePositive(raw: string, decimals: number, maxInt = 9, loc: NumberLocale = EN_NUMBERS): number | null {
  const r = parseNumber(raw, { maxIntDigits: maxInt, decimals, allowZero: false }, loc);
  return r.ok ? r.value : null;
}
export const parseQty = (raw: string, loc: NumberLocale = EN_NUMBERS): number | null => parsePositive(raw, 3, 7, loc);
export const parseWeight = (raw: string, loc: NumberLocale = EN_NUMBERS): number | null => parsePositive(raw, 3, 9, loc);

/** Which weight field the row shows: the line's own mode, unless the shipper pressed Change on a derived one. */
export const rowWeightMode = (row: CargoRow): WeightMode => (row.ownWeight ? 'ask' : row.mode);

/** The weight in the box, in kg, or null while it is not a number. */
export function typedKg(row: CargoRow, loc: NumberLocale = EN_NUMBERS): number | null {
  const w = parseWeight(row.weight, loc);
  if (w === null || row.wUnit === null) return null;
  return row.wUnit === 'Tonnes' ? w * 1000 : w;
}
/** The row's total weight in kg: what is typed when it is a number, else what the gateway has. */
export const rowTotalKg = (row: CargoRow, loc: NumberLocale = EN_NUMBERS): number | null => typedKg(row, loc) ?? row.weightKg;

/** What still stops this row from being posted. Empty ⇒ complete. */
export function rowIssues(row: CargoRow, loc: NumberLocale = EN_NUMBERS): RowIssue[] {
  const out: RowIssue[] = [];
  if (!row.productId) out.push('product');
  if (parseQty(row.qty, loc) === null) out.push('qty');
  if (row.unit === null) out.push('unit');
  if (rowWeightMode(row) !== 'derived') {
    if (parseWeight(row.weight, loc) === null) out.push('weight');
    if (row.wUnit === null) out.push('wUnit');
  }
  return out;
}

/** True when every line is complete — the only time the cargo answer may be posted (§20.12). */
export const cargoComplete = (rows: readonly CargoRow[], loc: NumberLocale = EN_NUMBERS): boolean => rows.length > 0 && rows.every((r) => rowIssues(r, loc).length === 0);

/** §5.1 `cargo`: every line, `productId` a number, `weight`/`wUnit` only when the shipper gave them; null while anything is missing. */
export function cargoAnswer(stopKey: string | undefined, rows: readonly CargoRow[], loc: NumberLocale = EN_NUMBERS): IntakeAnswerWire | null {
  if (!stopKey || !cargoComplete(rows, loc)) return null;
  const lines: Extract<IntakeAnswerWire, { step: 'cargo' }>['lines'] = [];
  for (const r of rows) {
    const productId = Number(r.productId);
    const qty = parseQty(r.qty, loc);
    if (!Number.isSafeInteger(productId) || qty === null || r.unit === null) return null;
    const own = rowWeightMode(r) !== 'derived';
    const weight = own ? parseWeight(r.weight, loc) : null;
    lines.push({
      ...(r.key ? { key: r.key } : {}), productId, qty, unit: r.unit,
      ...(own && weight !== null && r.wUnit ? { weight, wUnit: r.wUnit } : {}),
    });
  }
  return { step: 'cargo', stopKey, lines };
}

/** The line's plausibility as the sentence to show and the chip to offer (§20.4). Null-safe: no `suggestKg` ⇒ no chip. */
export interface PlausibilityNote { key: string; params: Record<string, string | number>; chipKg: number | null }
export function plausibilityNote(row: CargoRow, loc: NumberLocale = EN_NUMBERS): PlausibilityNote | null {
  const p = row.plausibility;
  if (!p) return null;
  const total = rowTotalKg(row, loc);
  const q = parseQty(row.qty, loc);
  const suggest = p.suggestKg;
  if (p.kind === 'odd') {
    if (total === null) return null;
    return suggest !== null
      ? { key: 'cargo.weight.checkOdd', params: { total, suggest }, chipKg: suggest }
      : { key: 'cargo.weight.checkOdd.noSuggest', params: { total }, chipKg: null };
  }
  const perUnit = p.kgPerUnit ?? (total !== null && q !== null ? Math.round((total / q) * 10) / 10 : null);
  if (suggest !== null && perUnit !== null) {
    return { key: p.kind === 'low' ? 'cargo.weight.checkLow' : 'cargo.weight.checkHigh', params: { perUnit, suggest }, chipKg: suggest };
  }
  return total !== null ? { key: 'cargo.weight.checkOdd.noSuggest', params: { total }, chipKg: null } : null;
}

/** "10 EUR Pallets · Toilet paper": the spent row's text (`history.cargo` `{summary}`). */
export function cargoSummary(rows: readonly CargoRow[]): string {
  return rows.map((r) => `${r.qty} ${r.unit ?? ''} ${r.productLabel}`.replace(/\s+/g, ' ').trim()).join(' · ');
}

/** The shipper picked a product for a row: the label is kept so the spent row can say it. */
export function withProduct(rows: readonly CargoRow[], index: number, id: string, label: string): CargoRow[] {
  return rows.map((r, i) => (i === index ? { ...r, productId: id, productLabel: label, match: null } : r));
}
export function patchRow(rows: readonly CargoRow[], index: number, patch: Partial<CargoRow>): CargoRow[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
}
