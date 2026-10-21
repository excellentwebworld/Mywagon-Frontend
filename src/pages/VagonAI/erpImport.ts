/**
 * The direct ERP import card's decisions, kept out of React so they can be
 * tested without rendering: which mapping rows to show, when Import is allowed,
 * and how flags are ordered and labelled.
 */
import {
  IMPORT_STAGES,
  type ImportFlag,
  type ImportIncompleteReason,
  type ImportMappingRow,
  type ImportPlanCounts,
  type ImportPreviewOrder,
  type ImportStage,
  type ImportSummary,
  type ImportView,
} from './api/orderImportService';

/** Fields every file needs in some form - shown in the mapping table even when unmapped. */
export const KEY_FIELDS = [
  'order_number',
  'customer_name',
  'vat',
  'customer_code',
  'full_address',
  'street',
  'city',
  'postcode',
  'warehouse',
  'sku',
  'product_name',
  'quantity',
  'weight',
  'delivery_date',
  'ship_date',
];

/**
 * The rows of the mapping table: every mapped field, plus the key fields that
 * are not - so a gap is a visible empty row rather than an absence.
 */
export function visibleMappingRows(view: ImportView): ImportMappingRow[] {
  return view.mapping.filter((row) => row.header !== null || KEY_FIELDS.includes(row.field));
}

export type ConfidenceLevel = 'high' | 'check' | 'none';

/** High when the dictionary, a saved mapping or the shipper chose it; "check" for a model guess. */
export function confidenceLevel(row: ImportMappingRow): ConfidenceLevel {
  if (row.header === null) return 'none';
  if (row.source === 'ai' || (row.confidence ?? 0) < 0.8) return 'check';
  return 'high';
}

/** Orders the run writes: new ones, and existing unplanned ones it updates (MS3-368). */
export function ordersToWrite(counts: ImportPlanCounts): number {
  return counts.toCreate + (counts.toUpdate ?? 0);
}

/** Orders left alone because they are already on a load; an older gateway calls them duplicates. */
export function ordersPlanned(counts: ImportPlanCounts): number {
  return counts.plannedSkipped ?? counts.duplicates;
}

/**
 * Why Import is disabled. "Already planned" and "every order has an error"
 * are told apart: lumping them together hid a missing date column behind
 * "already in your account" (QA B2).
 */
export type ImportBlocker = 'mapping' | 'all_duplicates' | 'all_failed' | null;

export function importBlocker(view: ImportView): ImportBlocker {
  if (view.status === 'mapping' || view.gaps.length > 0 || !view.counts) return 'mapping';
  if (ordersToWrite(view.counts) === 0) return view.counts.failed > 0 ? 'all_failed' : 'all_duplicates';
  return null;
}

/** An Orders row's status chip. An older gateway's 'duplicate' was always skipped, as a planned order is now. */
export type OrderRowStatus = 'create' | 'update' | 'planned' | 'failed';

export function orderRowStatus(order: Pick<ImportPreviewOrder, 'status'>): OrderRowStatus {
  return order.status === 'planned_skip' || order.status === 'duplicate' ? 'planned' : order.status;
}

/** The Orders list gets a search box above this many rows (MS3-368). */
export const ORDER_SEARCH_MIN = 15;

/** Orders whose number contains the query, ignoring case and spaces; all of them for an empty query. */
export function searchOrders<T extends Pick<ImportPreviewOrder, 'orderNumber'>>(orders: T[], query: string): T[] {
  const fold = (v: string) => v.toLocaleLowerCase().replace(/\s+/g, '');
  const q = fold(query);
  return q ? orders.filter((o) => fold(o.orderNumber).includes(q)) : orders;
}

/**
 * "€1,234.50" / "1.234,50 €" in the shipper's locale. The file's own currency
 * when it names one, euros otherwise - the Orders column is "Order value (€)".
 */
export function formatOrderValue(value: number | null | undefined, currency: string | null | undefined, lang: string): string | null {
  if (value === null || value === undefined) return null;
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: currency || 'EUR' }).format(value);
  } catch {
    // A code Intl does not know - the number, then the code as the file wrote it.
    return `${value.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency ?? ''}`.trim();
  }
}

/** The error every failed order shares - when they all fail alike, that is the file's real problem. */
export function sharedFailure(view: ImportView): string | null {
  const failed = view.orders.filter((o) => o.status === 'failed');
  if (failed.length === 0) return null;
  return failed[0]!.errors.find((e) => failed.every((o) => o.errors.includes(e))) ?? null;
}

/** Open the mapping by itself when a column is missing or nothing can be imported. */
export function mappingNeedsAttention(view: ImportView): boolean {
  return view.gaps.length > 0 || importBlocker(view) === 'all_failed';
}

/**
 * The upload's analysis failed (MS3-367): the file was never mapped, so there is
 * nothing to retry - only another upload. A failed RUN keeps its mapping, and
 * its view still has counts.
 */
export const analysisFailed = (view: ImportView) => view.status === 'failed' && view.counts === null;

export type StepState = 'done' | 'current' | 'todo';

/** "Reading file -> Matching customers -> products -> locations", each done, current or still to come. */
export function analysisSteps(view: ImportView): { stage: ImportStage; state: StepState }[] {
  const at = IMPORT_STAGES.indexOf(view.stage ?? 'reading');
  return IMPORT_STAGES.map((stage, i) => ({ stage, state: i < at ? 'done' : i === at ? 'current' : 'todo' }));
}

/**
 * The review sections that wait on the shipper - they open by themselves and
 * show the amber mark (MS3-367). Everything else stays collapsed with a tick.
 */
/** New products whose type is only the catch-all (or unknown) - worth a look before importing (MS3-370). */
export function productsToCheck(view: ImportView): number {
  return (view.review?.products.items ?? []).filter(
    (i) => i.status === 'new' && i.productType !== undefined && (i.productType === null || i.productType.source === 'fallback'),
  ).length;
}

export function sectionsNeedingInput(view: ImportView): {
  orders: boolean;
  customers: boolean;
  products: boolean;
  locations: boolean;
  columns: boolean;
} {
  const unansweredPickups = view.review ? view.review.locations.input : view.questions.filter((q) => q.answeredWith === null).length;
  return {
    orders: Boolean(view.counts && (view.counts.incomplete > 0 || view.counts.failed > 0)),
    // A customer matched by name alone, not yet confirmed or split (MS3-371).
    customers: (view.review?.customers.possible ?? 0) > 0,
    // Open whenever the file brings new products, so their proposed types are seen (MS3-370).
    products: (view.review?.products.new ?? 0) > 0,
    locations: unansweredPickups > 0,
    columns: view.gaps.length > 0,
  };
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** "no weight on 1 of 2 lines; no delivery date (ship date used)" in the shipper's language. */
export function describeIncomplete(reasons: ImportIncompleteReason[] | undefined, t: Translate): string {
  return (reasons ?? [])
    .map((r) =>
      r.kind === 'weight'
        ? r.lines === r.of
          ? t('vagonai.erpImport.incomplete.weight')
          : t('vagonai.erpImport.incomplete.weightSome', { count: r.lines, of: r.of })
        : r.kind === 'weight_unit'
          ? t('vagonai.erpImport.incomplete.weightUnit', { unit: r.unit })
          : t('vagonai.erpImport.incomplete.deliveryDate'),
    )
    .join('; ');
}

/** The order the flags are listed in: what stops a load first, data quality last. */
export const FLAG_ORDER: ImportFlag[] = ['blocked', 'customer_pickup', 'own_fleet', 'adr', 'incomplete', 'no_dropoff', 'needs_pin', 'no_pickup'];

export function sortedFlags(flags: Partial<Record<ImportFlag, number>>): [ImportFlag, number][] {
  return FLAG_ORDER.filter((f) => (flags[f] ?? 0) > 0).map((f) => [f, flags[f]!]);
}

/** A flag shown on an order row: no_pickup is the open question, shown once above, not on every row. */
export function rowFlags(flags: ImportFlag[]): ImportFlag[] {
  return FLAG_ORDER.filter((f) => f !== 'no_pickup' && flags.includes(f));
}

export const isFinished = (view: ImportView) => view.status === 'done' || view.status === 'failed';

/**
 * The columns a gateway gap can be closed with, in the order the card offers
 * them. A gap is a requirement ("something identifies the receiver"), not a
 * field, so several columns can close one - mapping any of them is enough.
 */
export const GAP_FIELDS: Record<string, string[]> = {
  order_number: ['order_number'],
  customer_name: ['customer_name'],
  quantity: ['quantity'],
  receiver_id: ['vat', 'customer_code'],
  address: ['full_address', 'city'],
  sku: ['sku', 'product_name'],
  delivery_date: ['delivery_date', 'ship_date'],
};

/**
 * One thing the import cannot decide without the shipper. The card lists these
 * above everything else, so the shipper answers questions instead of auditing
 * a mapping table: a clean file has none, and goes straight to Import.
 *
 * - `column`: a required column the engine found no match for. Blocks Import.
 * - `guess`: a key column the model chose. Confirming it is one click.
 * - `warehouse`: a pickup value matching none of the shipper's sites. Optional:
 *   the orders still import, without a pickup.
 */
export type ImportTask =
  | { kind: 'column'; key: string; gap: string; fields: string[] }
  | { kind: 'guess'; key: string; field: string; header: string }
  | { kind: 'warehouse'; key: string; raw: string; orderNumbers: string[] };

export function importTasks(view: ImportView): ImportTask[] {
  if (view.status !== 'mapping' && view.status !== 'ready') return [];
  const tasks: ImportTask[] = view.gaps.map((g) => ({
    kind: 'column',
    key: `gap:${g.field}`,
    gap: g.field,
    fields: GAP_FIELDS[g.field] ?? [g.field],
  }));
  for (const row of view.mapping) {
    // Only the columns a load is built from; a guessed "Notes" is not worth a question.
    if (row.header && KEY_FIELDS.includes(row.field) && confidenceLevel(row) === 'check') {
      tasks.push({ kind: 'guess', key: `guess:${row.field}`, field: row.field, header: row.header });
    }
  }
  // No weight-basis question (MS3-372): the gateway reads weight as written and
  // multiplies by quantity only for a per-unit header; see `perUnitWeightHeader`.
  for (const q of view.questions) {
    if (q.answeredWith === null) tasks.push({ kind: 'warehouse', key: `wh:${q.key}`, raw: q.raw, orderNumbers: q.orderNumbers });
  }
  return tasks;
}

/**
 * The weight column's header when the gateway multiplies it by quantity (a
 * per-unit header, or a Business Central shipment), for the card's one-line note.
 */
export function perUnitWeightHeader(view: ImportView): string | null {
  if (view.weightBasis !== 'per_unit') return null;
  return view.mapping.find((m) => m.field === 'weight' && m.header)?.header ?? null;
}

/** Whether a task stops Import. Only a missing column does; the rest improve the result. */
export const isBlockingTask = (task: ImportTask) => task.kind === 'column';

/**
 * The one-line verdict at the top of the card:
 * `ready` - Import can be pressed and nothing is left to check;
 * `review` - Import can be pressed, but there are guesses or questions worth a look;
 * `blocked` - Import cannot be pressed (a column, every order failing, or nothing new).
 */
export type ImportVerdict = 'ready' | 'review' | 'blocked';

export function importVerdict(view: ImportView, tasks: ImportTask[] = importTasks(view)): ImportVerdict {
  if (importBlocker(view)) return 'blocked';
  return tasks.length > 0 ? 'review' : 'ready';
}

/**
 * The file's columns split for a "which column has X?" picker: the ones no
 * field uses yet come first - when a column is missing, the answer is almost
 * always one of those - then the used ones, each with the field it feeds.
 */
export function columnChoices(view: ImportView): { unused: string[]; used: { header: string; field: string }[] } {
  const usedBy = new Map<string, string>();
  for (const m of view.mapping) if (m.header) usedBy.set(m.header, m.field);
  const unused: string[] = [];
  const used: { header: string; field: string }[] = [];
  for (const header of view.headers) {
    if (!header) continue;
    const field = usedBy.get(header);
    if (field) used.push({ header, field });
    else unused.push(header);
  }
  return { unused, used };
}

/** How many columns the engine matched on its own, for the collapsed "Columns" line. */
export function mappedColumnCount(view: ImportView): number {
  return view.mapping.filter((m) => m.header).length;
}

/** The ids of the orders an import created or updated, so the Orders panel can select them. */
export function createdOrderIds(summary: ImportSummary): string[] {
  return summary.items
    .filter((i) => (i.status === 'created' || i.status === 'updated') && i.orderId !== null)
    .map((i) => String(i.orderId));
}

/** Failed rows first, then rows that need a look, then the rest - what the shipper should read first. */
export function ordersByAttention(orders: ImportView['orders']): ImportView['orders'] {
  const rank = (o: ImportView['orders'][number]) =>
    o.status === 'failed' ? 0 : orderRowStatus(o) === 'planned' ? 3 : rowFlags(o.flags).length > 0 ? 1 : 2;
  return [...orders].sort((a, b) => rank(a) - rank(b));
}
