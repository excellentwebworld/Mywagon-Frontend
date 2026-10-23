/**
 * Hand-written R4 (`GET …/options/:kind`, CONTRACT.md §6.6) responses and the step events that carry the stop widgets.
 * The R4 lists are hand-written (the shapes follow §6.6). The step events are shaped like the gateway's
 * (`ChatBot/src/shipmentIntake/events.ts` `widgetFor`, re-checked 2026-10-20): the location widget always carries `city`,
 * `totalCandidates`, `defaultTab` and `noExactMatch`; a cargo line carries every field, `null` when unknown; the window
 * widget carries the "Any time" fields; more pickups carries `options`.
 */
import type {
  CargoLineSpec, Directory, IntakeStepEvent, LinePlausibility, OptionGroup, OptionItem, OptionsKind, OptionsOk, OptionsQuery, OptionsResponse, WeightMode, WidgetSpec,
} from '../contract';
import { KNOWN, txt, wire } from './intakeFixtures';

const ok = (kind: OptionsKind, o: Partial<OptionsOk> & { groups: OptionGroup[] }): OptionsOk => ({
  ok: true, kind, total: o.groups.reduce((n, g) => n + g.count, 0), nextCursor: null, defaultTab: null, ...o,
});
const loc = (id: string, title: string, subtitle: string, extra: Partial<OptionItem> = {}): OptionItem => ({ id, title, subtitle, ...extra });
/** A location candidate as the step event carries it: no distance, and why it matched (`reason`). */
const cand = (id: string, title: string, subtitle: string, reason: OptionItem['reason']): OptionItem => ({ id, title, subtitle, reason });

/* ── locations: grouped by COMPANY ── */
export const MY_SITES: OptionGroup[] = [
  { id: 'co_vagon', label: 'Vagon Foods SA', count: 3, collapsed: true, options: [
    loc('101', 'Athens Distribution Centre', 'Aspropyrgos, GR'), loc('102', 'Athens Warehouse', 'Elefsina, GR'), loc('103', 'Thessaloniki Hub', 'Sindos, GR'),
  ] },
  { id: 'co_nord', label: 'Nord Paper Ltd', count: 2, collapsed: true, options: [loc('111', 'Nord Paper Mill', 'Kavala, GR'), loc('112', 'Nord Depot', 'Xanthi, GR')] },
];
export const CUSTOMER_SITES: OptionGroup[] = [
  { id: 'co_alpha', label: 'Alpha Retail', count: 2, collapsed: true, options: [loc('201', 'Alpha Store Ioannina', 'Ioannina, GR'), loc('202', 'Alpha Store Larissa', 'Larissa, GR')] },
  { id: 'co_beta', label: 'Beta Supermarkets', count: 2, collapsed: true, options: [loc('211', 'Beta Central Warehouse', 'Patras, GR'), loc('212', 'Beta Store Corfu', 'Corfu, GR')] },
  // The server counted this company's sites but did not send them (§6.6 `collapsed`): they come with `group=co_gamma`.
  { id: 'co_gamma', label: 'Gamma Pharma', count: 4, collapsed: true, options: [] },
];
export const GAMMA_SITES: OptionItem[] = [
  loc('221', 'Gamma Pharma HQ', 'Athens, GR'), loc('222', 'Gamma Pharma Cold Store', 'Volos, GR'), loc('223', 'Gamma Depot North', 'Serres, GR'), loc('224', 'Gamma Depot South', 'Kalamata, GR'),
];

/* ── products: Category › Type › SKU ──
 * A type group's FIRST option is the shipper's own type row (`kind:'type'`, id = that row's id, NOT the group id — §20.5); then its SKUs.
 * A type with no such row carries the option `disabled:true` and no usable id. Group ids are opaque (§20.6). */
const sku = (id: string, title: string, subtitle: string): OptionItem => ({ id, title, subtitle, kind: 'sku' });
const typeRow = (id: string, title: string): OptionItem => ({ id, title, kind: 'type' });
export const WATER_SKUS: OptionItem[] = [sku('1301', 'Spring water 0.5 l (24 pack)', 'SKU WAT-05'), sku('1302', 'Spring water 1.5 l (6 pack)', 'SKU WAT-15'), sku('1303', 'Sparkling water 0.33 l', 'SKU WAT-33'), sku('1304', 'Mineral water 5 l', 'SKU WAT-50')];
export const PRODUCTS_PAGE_1: OptionGroup[] = [
  { id: 'cat_paper', label: 'Paper goods', count: 5, collapsed: true, options: [], children: [
    { id: 'ty_toilet', label: 'Toilet paper', count: 3, collapsed: true, options: [typeRow('501', 'Toilet paper'), sku('1001', 'Toilet paper 3-ply, 12 rolls', 'SKU TP-312'), sku('1002', 'Toilet paper 2-ply, 24 rolls', 'SKU TP-224'), sku('1003', 'Toilet paper jumbo roll', 'SKU TP-JMB')] },
    { id: 'ty_kitchen', label: 'Kitchen roll', count: 2, collapsed: true, options: [typeRow('502', 'Kitchen roll'), sku('1011', 'Kitchen roll 2-pack', 'SKU KR-2'), sku('1012', 'Kitchen roll 6-pack', 'SKU KR-6')] },
  ] },
  { id: 'cat_bev', label: 'Beverages', count: 4, collapsed: true, options: [], children: [
    // Counted, not sent: opening it fetches `group=ty_water`, which brings the type row and the SKUs.
    { id: 'ty_water', label: 'Water', count: 4, collapsed: true, options: [] },
  ] },
];
export const PRODUCTS_PAGE_2: OptionGroup[] = [
  { id: 'cat_clean', label: 'Cleaning', count: 4, collapsed: true, options: [], children: [
    { id: 'ty_detergent', label: 'Detergent', count: 3, collapsed: true, options: [typeRow('504', 'Detergent'), sku('1021', 'Detergent 5 l', 'SKU DT-5'), sku('1022', 'Detergent 10 l', 'SKU DT-10'), sku('1023', 'Dish soap 750 ml', 'SKU DS-75')] },
    // The shipper has no type row for this one: the type option is `disabled` (no id fallback), its SKU can still be chosen.
    { id: 'ty_misc', label: 'Misc cleaning', count: 1, collapsed: true, options: [{ id: 'ty_misc_none', title: 'Misc cleaning', kind: 'type', disabled: true }, sku('1031', 'Cleaning cloth', 'SKU CL-1')] },
  ] },
];
const PRODUCT_TOTAL = 13;

/** A list long enough that a search box is worth showing (> FILTER_AFTER) and that needs two pages. `total` is the true count on EVERY page (§20.7). */
export const productsPage = (cursor?: string): OptionsOk =>
  cursor === 'p2'
    ? ok('products', { groups: PRODUCTS_PAGE_2, total: PRODUCT_TOTAL, nextCursor: null })
    : ok('products', { groups: PRODUCTS_PAGE_1, total: PRODUCT_TOTAL, nextCursor: 'p2' });

export const ORDER_GROUPS: OptionGroup[] = [
  { id: 'cust_alpha', label: 'Alpha Retail', count: 2, collapsed: true, options: [
    { id: 'o_9001', title: 'PO 9001 · 10 pallets', subtitle: 'Ioannina · 23 Oct' }, { id: 'o_9002', title: 'PO 9002 · 4 pallets', subtitle: 'Ioannina · 24 Oct' },
  ] },
  { id: 'cust_beta', label: 'Beta Supermarkets', count: 1, collapsed: true, options: [{ id: 'o_9010', title: 'PO 9010 · 8 pallets', subtitle: 'Patras · 23 Oct' }] },
];

const allOptions = (groups: OptionGroup[]): OptionItem[] => groups.flatMap((g) => [...g.options, ...allOptions(g.children ?? [])]);

/** What the fake gateway serves. `extraSites` / `extraProducts` are records "created" during a test (create-in-place). */
export function fakeOptions(extra: { sites?: OptionItem[]; products?: OptionItem[] } = {}) {
  const calls: { kind: OptionsKind; query: OptionsQuery }[] = [];
  const fn = async (kind: OptionsKind, query: OptionsQuery = {}): Promise<OptionsResponse> => {
    calls.push({ kind, query });
    const q = (query.q ?? '').trim().toLowerCase();
    if (kind === 'locations') {
      const dir: Directory = query.directory ?? (query.role === 'dropoff' ? 'customers' : 'my_locations');
      const groups = dir === 'customers' ? CUSTOMER_SITES : MY_SITES;
      if (query.group === 'co_gamma') return ok('locations', { groups: [{ id: 'co_gamma', label: 'Gamma Pharma', count: 4, options: GAMMA_SITES }], total: 4 });
      if (q) return ok('locations', { groups: [], flat: [...allOptions([...MY_SITES, ...CUSTOMER_SITES]), ...GAMMA_SITES, ...(extra.sites ?? [])].filter((o) => o.title.toLowerCase().includes(q)), total: 1 });
      return ok('locations', { groups, defaultTab: query.role === 'dropoff' ? 'customers' : 'my_locations' });
    }
    if (kind === 'products') {
      // §20.6: `group=<id>` answers with ONLY that group: a leaf (type) carries its options, type row first.
      if (query.group === 'ty_water') return ok('products', { groups: [{ id: 'ty_water', label: 'Water', count: 4, options: [typeRow('503', 'Water'), ...WATER_SKUS] }], total: 4 });
      if (q) return ok('products', { groups: [], flat: [...allOptions([...PRODUCTS_PAGE_1, ...PRODUCTS_PAGE_2]), ...WATER_SKUS, ...(extra.products ?? [])].filter((o) => o.title.toLowerCase().includes(q)), total: 1 });
      return productsPage(query.cursor);
    }
    if (kind === 'orders') return ok('orders', { groups: ORDER_GROUPS });
    return { ok: false, code: 'unavailable', message: txt('error.unavailable', 'Not available').text } as OptionsResponse;
  };
  return Object.assign(fn, { calls });
}

/* ── step events (§8.3) ── */
/** The stop steps come before the terms: the six terms are still to ask (events.ts `remainingAfter`); the chips grow as the stops do. */
const base = { v: 1 as const, intakeId: 'int_9f1c', notices: [], known: [], remaining: 7, canExpress: false, canToSummary: false, editing: false };
const step = (rev: number, kind: IntakeStepEvent['step'], o: Partial<IntakeStepEvent> & { widget: WidgetSpec; prompt: IntakeStepEvent['prompt']; fallbackText: string }): IntakeStepEvent => ({
  ...base, type: 'step', stepId: `int_9f1c:${rev}`, rev, step: kind, ...o,
});

export const locationWidgetStep = (
  o: { role?: 'pickup' | 'dropoff'; noExact?: boolean; canCreate?: boolean; candidates?: OptionItem[]; defaultTab?: Directory | null; totalCandidates?: number } = {}, rev = 3,
): IntakeStepEvent => {
  const role = o.role ?? 'pickup';
  const candidates = o.candidates ?? (o.noExact
    ? [cand('102', 'Athens Warehouse', 'Elefsina, GR', 'city'), cand('101', 'Athens Distribution Centre', 'Aspropyrgos, GR', 'city')]
    : [cand('101', 'Athens Distribution Centre', 'Aspropyrgos, GR', 'name'), cand('102', 'Athens Warehouse', 'Elefsina, GR', 'city')]);
  const prompt = role === 'pickup' ? txt('location.pickup.prompt', 'Where is it picked up?') : txt('location.dropoff.prompt', 'Where is it dropped off?');
  return step(rev, 'location', {
    stopKey: role === 'pickup' ? 's1' : 's2', stopRole: role, stopIndex: role === 'pickup' ? 0 : 1,
    ...(role === 'dropoff' ? { known: KNOWN.slice(0, 1), remaining: 7 } : { remaining: 9 }),
    prompt,
    // No `options` on this step, so the gateway's fallback is the question alone.
    fallbackText: prompt.text,
    widget: {
      kind: 'location', role, query: 'Athens DC', city: null, candidates, canCreate: o.canCreate ?? true,
      totalCandidates: o.totalCandidates ?? candidates.length,
      noExactMatch: o.noExact === true,
      defaultTab: o.defaultTab !== undefined ? o.defaultTab : role === 'dropoff' ? 'customers' : 'my_locations',
    },
  });
};

export const cargoStep = (
  o: {
    weightMode?: WeightMode; match?: 'unique' | 'ambiguous' | 'none'; empty?: boolean; canCreate?: boolean;
    /** A typed weight in kg on the line, and a plausibility the gateway attached to it (§20.4). */
    weight?: number; plausibility?: LinePlausibility; unitPending?: boolean;
    /** The ambiguous match also offers a type whose row is disabled (no generic row, §20.5). */
    disabledType?: boolean;
    /** A second line with its OWN weightMode (per-line is authoritative). */
    secondLine?: WeightMode;
  } = {}, rev = 4,
): IntakeStepEvent => {
  const m = o.match ?? 'unique';
  const mode = o.weightMode ?? 'derived';
  const weightBits: Partial<CargoLineSpec> = mode === 'derived'
    ? { weight: o.weight ?? 1200, weightSource: 'product' }
    : mode === 'pending_unit' ? { pendingWeight: { value: o.weight ?? 5 }, weightSource: null } : { ...(o.weight !== undefined ? { weight: o.weight, weightSource: 'user' as const } : {}) };
  // Every field of a line is on the wire, `null` when not known (events.ts `cargoWidget`); `productMatch` only while the product is open.
  const unknown = { productId: null, productLabel: null, productQuery: null, productMatch: null, qty: null, unit: null, unitPending: false, weight: null, weightSource: null, pendingWeight: null };
  const line: CargoLineSpec = o.empty ? { key: 'l1', ...unknown, weightMode: 'ask' } : m === 'unique'
    ? { key: 'l1', ...unknown, productId: 1001, productLabel: 'Toilet paper 3-ply, 12 rolls', productQuery: 'toilet paper', qty: 10, unit: o.unitPending ? null : 'EUR Pallets', unitPending: o.unitPending === true, weightMode: mode, ...weightBits, ...(o.plausibility ? { plausibility: o.plausibility } : {}) }
    : {
      key: 'l1', ...unknown, productQuery: m === 'none' ? 'toothpaste' : 'toilet paper', qty: 10, unit: 'EUR Pallets', unitPending: false, weightMode: 'ask',
      productMatch: m === 'none' ? { kind: 'none', skus: [], types: [] } : {
        kind: 'ambiguous',
        skus: [sku('1001', 'Toilet paper 3-ply, 12 rolls', 'SKU TP-312'), sku('1002', 'Toilet paper 2-ply, 24 rolls', 'SKU TP-224')],
        types: [typeRow('501', 'Toilet paper'), ...(o.disabledType ? [{ id: 'ty_misc_none', title: 'Misc cleaning', kind: 'type' as const, disabled: true }] : [])],
      },
    };
  const second: CargoLineSpec[] = o.secondLine
    ? [{ key: 'l2', ...unknown, productId: 1011, productLabel: 'Kitchen roll 2-pack', productQuery: 'kitchen roll', qty: 4, unit: 'Boxes', unitPending: false, weightMode: o.secondLine, ...(o.secondLine === 'derived' ? { weight: 80, weightSource: 'product' as const } : {}) }]
    : [];
  return step(rev, 'cargo', {
    stopKey: 's1', stopRole: 'pickup', stopIndex: 0, known: KNOWN.slice(0, 1), remaining: 8,
    prompt: txt('cargo.prompt', 'What are we moving, and how much?'),
    fallbackText: 'What are we moving, and how much?',
    widget: {
      // The widget-level weightMode / derivedKg / derivedText describe the FIRST line only (§20.4).
      kind: 'cargo', stopKey: 's1', lines: [line, ...second], weightMode: line.weightMode ?? mode,
      ...(mode === 'derived' && !o.empty ? { derivedKg: o.weight ?? 1200, derivedText: txt('cargo.weight.derived', `Weight: ${(o.weight ?? 1200).toLocaleString('en-US')} kg (from the product)`, { kg: o.weight ?? 1200 }) } : {}),
      canCreate: o.canCreate ?? true, unitOptions: ['EUR Pallets', 'US Pallets', 'Boxes', 'Units', 'Big Bags'],
    },
  });
};

export const windowStep = (o: { role?: 'pickup' | 'dropoff'; date?: string | null; minDate?: string | null } = {}, rev = 5): IntakeStepEvent => {
  const role = o.role ?? 'pickup';
  const prompt = role === 'pickup' ? txt('window.pickup.prompt', 'When can the truck load?') : txt('window.dropoff.prompt', 'When should it be delivered?');
  return step(rev, 'window', {
    stopKey: role === 'pickup' ? 's1' : 's2', stopRole: role, stopIndex: role === 'pickup' ? 0 : 1,
    known: role === 'pickup' ? KNOWN.slice(0, 1).concat(KNOWN[2]!) : KNOWN, remaining: role === 'pickup' ? 7 : 6,
    prompt,
    fallbackText: prompt.text,
    // MS3-408: "Any time" is an answer; a drop-off may leave the day open too.
    widget: wire({
      kind: 'window', role, date: o.date === undefined ? '2026-10-23' : o.date, timeFrom: '08:00', timeTo: null, minDate: o.minDate === undefined ? '2026-10-16' : o.minDate,
      presets: [{ from: '08:00', to: '12:00' }, { from: '12:00', to: '17:00' }],
    }, {
      anyTime: false,
      anyTimeLabel: txt('window.anyTime', 'Any time'),
      anyTimeHint: txt('window.anyTime.hint', 'No fixed slot: the whole day is open.'),
      anyTimeNeedsDate: role !== 'dropoff',
    }),
  });
};

export const morePickupsStep = (rev = 6): IntakeStepEvent => step(rev, 'more_pickups', {
  known: KNOWN.slice(0, 1).concat(KNOWN[2]!, KNOWN[3]!), remaining: 7,
  // The gateway's order: "No" first, pre-selected.
  prompt: txt('morePickups.prompt', 'Anything else to pick up?'), fallbackText: 'Anything else to pick up?\n1. No, that\'s all\n2. More from this site\n3. Another site',
  // The gateway sends `options` (this build reads `choices`, and falls back to its own three answers without them).
  widget: wire({ kind: 'more_pickups' }, {
    options: [
      { id: 'no', label: txt('morePickups.no', "No, that's all"), selected: true },
      { id: 'same_location', label: txt('morePickups.same', 'More from this site') },
      { id: 'another_location', label: txt('morePickups.other', 'Another site') },
    ],
  }),
});

/** NOT a gateway shape: the gateway never sends the first page inline (the widget asks R4 `orders`); kept for the list preview. */
export const pickOrdersListStep = (rev = 2): IntakeStepEvent => step(rev, 'pick_orders', {
  remaining: 6,
  prompt: txt('orders.prompt', 'Which orders go on this load?'), fallbackText: 'Which orders go on this load?',
  widget: { kind: 'pick_orders', search: true, multiple: true, orders: ok('orders', { groups: ORDER_GROUPS }) },
});
