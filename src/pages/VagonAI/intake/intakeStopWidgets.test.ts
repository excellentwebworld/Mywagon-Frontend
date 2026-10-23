/**
 * WP3b — the stop widgets: location picker (MS3-398), product tree (MS3-394), create-in-place (MS3-397), window, more pickups,
 * pick orders, and the R4 plumbing under them (`optionsModel`, `pickerTree`, `GroupedPicker`, `optionsPath`).
 * Written against the HAND-WRITTEN fixtures in `fixtures/optionsFixtures.ts` (no gateway, no WP1 counts/tree endpoint exists).
 * Rendered through the real host view, so the wiring is under test too.
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CargoWidgetSpec, IntakeEvent, IntakeStepEvent, OptionItem, OptionsOk } from './contract';
import {
  cargoAnswer, cargoRowsOf, cargoSummary, parsePositive, parseQty, parseWeight, patchRow, plausibilityNote, rowIssues, rowWeightMode, unitOptionsOf, withProduct,
} from './cargoModel';
import * as ox from './fixtures/optionsFixtures';
import * as fx from './fixtures/intakeFixtures';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import type { CreatedRecord, IntakeCreateKit } from './intakeCreate';
import { answerLabel, channelDefaultOf, defaultTabOf, locationAnswer, optionDetail, stepViewOf } from './intakeModel';
import { optionsPath } from './intakeService';
import { allTestIds, byTestId, click, LOCALES, makeExists, makeUi, render, textOf, type Lang } from './intakeTestKit';
import { collectAll, findGroup, groupFromResponse, itemsForGroup, itemsOf, MAX_AUTO_PAGES, mergePages } from './optionsModel';
import { answerIdOf, countOf, fillGroup, loadedCount, matches, nodesOfGroups, nodesOfResponse, replaceGroup, toggled, visibleRows } from './pickerTree';
import { DEFAULT_FROM, isPastDate, validDate, validTime, windowAnswer, windowDraftOf, windowIssues, windowText } from './windowModel';
import { feKey } from './intakeCopy';
import { LIST_MAX_HEIGHT } from './widgets/GroupedPicker';

const cargoSpec = (e: IntakeStepEvent): CargoWidgetSpec => {
  const v = stepViewOf(e);
  if (v.kind !== 'cargo') throw new Error(`not a cargo step: ${v.kind}`);
  return v.spec;
};
const flush = async () => { for (let i = 0; i < 8; i += 1) await new Promise<void>((r) => { setTimeout(r, 0); }); };

const actions = (opts: { options?: ReturnType<typeof ox.fakeOptions> | null } = {}) => {
  const fake = opts.options === null ? undefined : (opts.options ?? ox.fakeOptions());
  const a = {
    answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn(),
    ...(fake ? { options: vi.fn((_e: IntakeStepEvent, kind: Parameters<typeof fake>[0], q?: Parameters<typeof fake>[1]) => fake(kind, q ?? {})) } : {}),
  };
  return { a: a as unknown as IntakeActions & Record<keyof IntakeActions, ReturnType<typeof vi.fn>>, fake };
};

/** A create kit that renders a stand-in form and lets the test "save" a record. */
function stubKit() {
  const handlers: { current?: Parameters<IntakeCreateKit['form']>[2] } = {};
  const kit: IntakeCreateKit & { open: ReturnType<typeof vi.fn>; form: ReturnType<typeof vi.fn> } = {
    open: vi.fn(async () => ({ stub: true })),
    form: vi.fn((kind, _bundle, h) => { handlers.current = h; return createElement('div', { 'data-testid': `stub-form-${kind}` }, 'FORM'); }) as never,
  } as never;
  return { kit, save: (rec: CreatedRecord) => handlers.current!.onSaved(rec), handlers };
}

function host(event: IntakeEvent, o: { lang?: Lang; busy?: boolean; states?: unknown[]; options?: ReturnType<typeof ox.fakeOptions> | null; create?: IntakeCreateKit } = {}) {
  const { a, fake } = actions({ options: o.options });
  const lang = o.lang ?? 'en';
  const r = render(createElement(IntakeWidgetHostView, {
    ui: makeUi(lang), exists: makeExists(lang), state: { kind: 'event', event }, live: true, busy: o.busy ?? false, canMeasureRoute: true, actions: a, create: o.create,
  }), o.states);
  return { ...r, a, fake, text: textOf(r.tree), ids: allTestIds(r.tree), el: (id: string) => byTestId(r.tree, id) };
}
const noRawKeys = (text: string) => { expect(text).not.toMatch(/vagonai\.shipment/); expect(text).not.toMatch(/\{\{|\}\}/); };
const typed = (h: { el: (id: string) => ReturnType<typeof byTestId> }, id: string, value: string) => (h.el(id)!.props.onChange as (e: unknown) => void)({ target: { value } });

const mine = (): OptionsOk => ({ ok: true, kind: 'locations', total: 5, nextCursor: null, defaultTab: null, groups: ox.MY_SITES });
const cust = (): OptionsOk => ({ ok: true, kind: 'locations', total: 8, nextCursor: null, defaultTab: null, groups: ox.CUSTOMER_SITES });
const allProducts = async (): Promise<OptionsOk> => {
  const fake = ox.fakeOptions();
  const res = await collectAll((cursor) => fake('products', cursor ? { cursor } : {}));
  if (!res.ok) throw new Error('fixture');
  return res;
};

/* ───────────────────────────── R4 plumbing ───────────────────────────── */

describe('R4 query string (§6.6)', () => {
  it('sends only the documented parameters and drops empties', () => {
    const qs = (p: string) => Object.fromEntries(new URLSearchParams(p.split('?')[1] ?? ''));
    expect(qs(optionsPath('int_1', 'locations', { role: 'pickup', directory: 'customers', stopKey: 's1', q: '', group: undefined })))
      .toEqual({ limit: '50', role: 'pickup', directory: 'customers', stopKey: 's1' }); // §20.7: limit defaults to 50
    expect(optionsPath('int_1', 'locations', { q: '  ' })).toMatch(/\/options\/locations\?limit=50$/);
    expect(qs(optionsPath('int_1', 'locations', { limit: 500 })).limit).toBe('100'); // §6.6: limit ≤ 100
    expect(qs(optionsPath('int_1', 'products', { group: 'ty_water', cursor: 'p2', limit: 100 }))).toEqual({ group: 'ty_water', cursor: 'p2', limit: '100' });
    expect(qs(optionsPath('int_1', 'products', { limit: 20 })).limit).toBe('20');
  });
  it('no query is the bare path with the page size', () => {
    expect(optionsPath('int_1', 'partners')).toMatch(/\/options\/partners\?limit=50$/);
  });
});

describe('optionsModel — pages, groups, counts', () => {
  it('collects every page of the product tree and keeps the TRUE total', async () => {
    const res = await allProducts();
    expect(res.total).toBe(13); // true on EVERY page (§20.7), not just the last
    expect(ox.productsPage().total).toBe(13);
    expect(ox.productsPage('p2').total).toBe(13);
    expect(res.nextCursor).toBeNull();
    expect(res.groups.map((g) => g.id)).toEqual(['cat_paper', 'cat_bev', 'cat_clean']);
  });
  it('a later page failing keeps what was loaded and its cursor', async () => {
    const fake = ox.fakeOptions();
    const res = await collectAll(async (c) => (c ? { ok: false, code: 'unavailable' } as never : fake('products', {})));
    expect(res.ok && res.nextCursor).toBe('p2');
  });
  it('the first page failing is the failure', async () => {
    const res = await collectAll(async () => ({ ok: false, code: 'unavailable' }) as never);
    expect(res.ok).toBe(false);
  });
  it('never walks more than MAX_AUTO_PAGES pages', async () => {
    const page = vi.fn(async (): Promise<OptionsOk> => ({ ok: true, kind: 'products', total: 999, nextCursor: 'more', defaultTab: null, groups: [] }));
    await collectAll(page);
    expect(page).toHaveBeenCalledTimes(MAX_AUTO_PAGES);
  });
  it('merges groups by id without duplicating options', () => {
    const merged = mergePages(ox.productsPage(), ox.productsPage());
    expect(merged.groups).toHaveLength(2);
    expect(findGroup(merged, 'ty_toilet')!.options).toHaveLength(4); // the type row + 3 SKUs
  });
  it('finds a group anywhere and builds one from a flat answer', () => {
    expect(findGroup(ox.productsPage(), 'ty_kitchen')!.label).toBe('Kitchen roll');
    expect(findGroup(ox.productsPage(), 'nope')).toBeNull();
    const g = groupFromResponse({ ...mine(), groups: [], flat: ox.GAMMA_SITES }, 'co_gamma', 'Gamma Pharma');
    expect(g.options).toHaveLength(4);
    expect(itemsForGroup(mine(), 'co_nord').map((o) => o.id)).toEqual(['111', '112']);
    expect(itemsOf(mine())).toHaveLength(5);
  });
});

describe('pickerTree — collapsed, true counts, search', () => {
  const tree = () => nodesOfGroups(ox.productsPage().groups, { selectableDepth: 1 });
  it('is collapsed by default: only the categories', () => {
    const rows = visibleRows(tree(), new Set(), '');
    expect(rows.map((r) => r.node.id)).toEqual(['cat_paper', 'cat_bev']);
    expect(rows.every((r) => !r.open)).toBe(true);
  });
  it('opening a category shows its types (selectable), not the SKUs', () => {
    const rows = visibleRows(tree(), new Set(['g:cat_paper']), '');
    expect(rows.map((r) => r.node.id)).toEqual(['cat_paper', 'ty_toilet', 'ty_kitchen', 'cat_bev']);
    expect(rows.find((r) => r.node.id === 'ty_toilet')!.node.selectable).toBe(true);
    expect(rows.find((r) => r.node.id === 'cat_paper')!.node.selectable).toBe(false);
  });
  it('counts are the server\'s, not what is loaded (a lazy type counts 4 with no rows)', () => {
    const water = nodesOfResponse(ox.productsPage(), { selectableDepth: 1 })[1]!.children[0]!;
    expect(water.lazy).toBe(true);
    expect(loadedCount(water.children)).toBe(0);
    expect(countOf(water)).toBe(4);
    expect(countOf(tree()[0]!)).toBe(5);
  });
  it('a search opens the groups that hold a match and hides the rest', () => {
    const rows = visibleRows(tree(), new Set(), 'kitchen');
    // The category holds the match (open); Kitchen roll matched by its own name, so its SKUs are shown with it.
    expect(rows.map((r) => r.node.id)).toEqual(['cat_paper', 'ty_kitchen', '1011', '1012']); // the type row is a pick, not one of the SKU rows
  });
  it('a SKU match shows its parents open', () => {
    const rows = visibleRows(tree(), new Set(), 'tp-224');
    expect(rows.map((r) => r.node.id)).toEqual(['cat_paper', 'ty_toilet', '1002']);
    expect(rows.slice(0, 2).every((r) => r.open)).toBe(true);
  });
  it('matching ignores case and Greek accents, and needs every word', () => {
    const n = nodesOfGroups([{ id: 'g', label: 'Αθήνα Αποθήκη', count: 1, options: [] }])[0]!;
    expect(matches(n, 'athina')).toBe(false);
    expect(matches(n, 'αθηνα')).toBe(true);
    expect(matches(n, 'ΑΠΟΘΗΚΗ αθηνα')).toBe(true);
    expect(matches(n, 'αθηνα xyz')).toBe(false);
  });
  it('fills and replaces a lazy group', () => {
    const lazy = nodesOfResponse(ox.productsPage(), { selectableDepth: 1 });
    const filled = fillGroup(lazy, 'ty_water', ox.WATER_SKUS);
    expect(loadedCount(filled[1]!.children)).toBe(4);
    const typeRow: OptionItem = { id: '503', title: 'Water', kind: 'type' };
    const replaced = replaceGroup(lazy, 'ty_water', { id: 'ty_water', label: 'Water', count: 4, options: [typeRow, ...ox.WATER_SKUS] }, { selectableDepth: 1 });
    expect(replaced[1]!.children[0]!.lazy).toBe(false);
    expect(replaced[1]!.children[0]!.selectable).toBe(true);
    expect(loadedCount(replaced[1]!.children[0]!.children)).toBe(4); // the type row is not counted as a SKU
  });
  it('§20.5: a type is answered with the id of its own type row, never the group id; a disabled type row is not pickable and has no fallback', () => {
    const [paper, , clean] = [...nodesOfGroups(ox.productsPage().groups, { selectableDepth: 1 }), ...nodesOfGroups(ox.productsPage('p2').groups, { selectableDepth: 1 })];
    const toilet = paper!.children[0]!;
    expect(toilet.id).toBe('ty_toilet');
    expect(toilet.pickId).toBe('501');
    expect(answerIdOf(toilet)).toBe('501');
    expect(toilet.children.map((c) => c.id)).toEqual(['1001', '1002', '1003']);
    const misc = clean!.children[1]!;
    expect(misc.id).toBe('ty_misc');
    expect(misc.selectable).toBe(false);
    expect(misc.typeDisabled).toBe(true);
    expect(misc.pickId).toBeUndefined();
    expect(misc.children.map((c) => c.id)).toEqual(['1031']); // its SKU can still be chosen
    // a type group with no type row at all is not a choice either (and does not fall back to its own id)
    const none = nodesOfGroups([{ id: 'ty_x', label: 'X', count: 1, options: [{ id: '1', title: 'A', kind: 'sku' }] }], { selectableDepth: 0 })[0]!;
    expect(none.selectable).toBe(false);
    expect(none.pickId).toBeUndefined();
  });
  it('toggled adds then removes a key', () => {
    expect(toggled(toggled([], 'a'), 'a')).toEqual([]);
  });
});

/* ───────────────────────────── location ───────────────────────────── */

describe('Location widget — the pickup picker', () => {
  const e = ox.locationWidgetStep();
  it('is the location widget, not the text step', () => {
    expect(stepViewOf(e).kind).toBe('location');
    expect(stepViewOf(fx.locationStep()).kind).toBe('text'); // the legacy text-only fixture stays the text step
  });
  it('shows the best match first, selected and tagged Suggested, one tap answers with the site (as a number)', () => {
    const h = host(e);
    expect(h.text).toContain('Where is it picked up?');
    expect(h.el('intake-location-cand-101')!.props['data-selected']).toBe('true');
    expect(h.ids).toContain('intake-location-cand-101-suggested');
    expect(h.el('intake-location-cand-102')!.props['data-selected']).toBe('false');
    expect(h.text).toContain('Aspropyrgos, GR');
    click(h.el('intake-location-cand-101'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'location', stopKey: 's1', locationId: 101 }, 'Athens Distribution Centre');
    noRawKeys(h.text);
  });
  it('without an exact match says so, tags nothing as Suggested, and still answers in one tap', () => {
    const ne = ox.locationWidgetStep({ noExact: true });
    const h = host(ne);
    expect(h.text).toContain("I couldn't find an exact match for \"Athens DC\"");
    expect(h.ids).not.toContain('intake-location-cand-102-suggested');
    click(h.el('intake-location-cand-102'));
    expect(h.a.answer).toHaveBeenCalledWith(ne, { step: 'location', stopKey: 's1', locationId: 102 }, 'Athens Warehouse');
  });
  it('the full list is collapsed away until "Browse all my sites" is tapped', () => {
    const h = host(e);
    expect(h.ids).toContain('intake-location-browse');
    expect(h.ids).not.toContain('intake-location-browsebox');
    expect(h.ids).not.toContain('intake-location-list');
  });
  it('browsing loads BOTH directories (true counts) and opens on My sites for a pickup', async () => {
    const h = host(e);
    click(h.el('intake-location-browse'));
    await flush();
    expect(h.setCalls[0]).toEqual({ index: 0, value: 'loading' });
    expect(h.setCalls.find((c) => c.index === 1)!.value).toBe('my_locations');
    expect(h.setCalls.find((c) => c.index === 0 && c.value === 'ready')).toBeTruthy();
    const data = h.setCalls.find((c) => c.index === 2)!.value as Record<string, OptionsOk>;
    expect(data.my_locations!.total).toBe(5);
    expect(data.customers!.total).toBe(8);
    expect(h.fake!.calls.map((c) => c.query.directory).sort()).toEqual(['customers', 'my_locations']);
  });
  it('a drop-off opens on Customers (MS3-398)', async () => {
    const d = ox.locationWidgetStep({ role: 'dropoff' });
    expect(defaultTabOf({ role: 'dropoff' })).toBe('customers');
    expect(defaultTabOf({ role: 'pickup' })).toBe('my_locations');
    expect(defaultTabOf({ role: 'pickup', defaultTab: 'customers' })).toBe('customers');
    const h = host(d);
    click(h.el('intake-location-browse'));
    await flush();
    expect(h.setCalls.find((c) => c.index === 1)!.value).toBe('customers');
    expect(h.text).toContain('Where is it dropped off?');
  });
  const browsing = (tab: 'my_locations' | 'customers', extra: unknown[] = []) => {
    const states = ['ready', tab, { my_locations: mine(), customers: cust() }, ...extra];
    return states;
  };
  it('lists the companies collapsed, each with its true count and the two tabs with theirs', () => {
    const h = host(e, { states: browsing('my_locations') });
    expect(h.text).toContain('My sites (5)');
    expect(h.text).toContain('Customers (8)');
    expect(h.el('intake-location-list-group-co_vagon')!.props['data-open']).toBe('false');
    expect(textOf([h.el('intake-location-list-count-co_vagon')!])).toBe('3');
    expect(textOf([h.el('intake-location-list-count-co_nord')!])).toBe('2');
    expect(h.ids.some((i) => i.startsWith('intake-location-list-opt-'))).toBe(false);
  });
  it('opening a company shows its sites; one tap on a site answers', () => {
    const key = nodesOfResponse(mine())[0]!.key;
    const h = host(e, { states: browsing('my_locations', [[key]]) });
    expect(h.el('intake-location-list-group-co_vagon')!.props['data-open']).toBe('true');
    click(h.el('intake-location-list-opt-103'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'location', stopKey: 's1', locationId: 103 }, 'Thessaloniki Hub');
  });
  it('tapping a company toggles it; a group is never itself an answer', () => {
    const h = host(e, { states: browsing('my_locations') });
    click(h.el('intake-location-list-group-co_nord'));
    expect(h.setCalls.find((c) => c.index === 3)!.value).toEqual(['g:co_nord']);
    expect(h.ids).not.toContain('intake-location-list-pick-co_nord');
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('the Customers tab holds the customer companies; switching tab clears the search', () => {
    const h = host(e, { states: browsing('customers') });
    expect(h.el('intake-location-list-group-co_alpha')).toBeTruthy();
    expect(h.el('intake-location-list-group-co_vagon')).toBeUndefined();
    click(h.el('intake-location-tab-my_locations'));
    expect(h.setCalls.find((c) => c.index === 1)!.value).toBe('my_locations');
    expect(h.setCalls.find((c) => c.index === 4)!.value).toBe('');
  });
  it('search: shows the box (the list is long), finds a site inside a closed company and opens that company only', () => {
    const h = host(e, { states: browsing('customers', [[], 'larissa']) });
    expect(h.el('intake-location-search')).toBeTruthy();
    expect(h.el('intake-location-list-group-co_alpha')!.props['data-open']).toBe('true');
    expect(h.ids).toContain('intake-location-list-opt-202');
    expect(h.ids).not.toContain('intake-location-list-group-co_beta');
    typed(h, 'intake-location-search', 'x');
    expect(h.setCalls.find((c) => c.index === 4)!.value).toBe('x');
  });
  it('search with no hit says so', () => {
    const h = host(e, { states: browsing('customers', [[], 'zzzz']) });
    expect(h.text).toContain('Nothing matches.');
  });
  it('a company the server counted but did not send is fetched when it is opened (group=<id>)', async () => {
    const h = host(e, { states: browsing('customers') });
    expect(textOf([h.el('intake-location-list-count-co_gamma')!])).toBe('4');
    click(h.el('intake-location-list-group-co_gamma'));
    await flush();
    expect(h.fake!.calls.some((c) => c.query.group === 'co_gamma' && c.query.directory === 'customers')).toBe(true);
    const filled = h.setCalls.filter((c) => c.index === 5).map((c) => c.value);
    expect(filled.length).toBeGreaterThan(0);
  });
  it('a failed browse says so and offers Try again', async () => {
    const failing = vi.fn(async () => ({ ok: false, code: 'unavailable' }) as never) as unknown as ReturnType<typeof ox.fakeOptions>;
    const h = host(e, { options: failing });
    click(h.el('intake-location-browse'));
    await flush();
    expect(h.setCalls.some((c) => c.index === 0 && c.value === 'error')).toBe(true);
    const h2 = host(e, { states: ['error'] });
    expect(h2.text).toContain('The list could not be loaded');
    expect(h2.ids).toContain('intake-location-error');
  });
  it('with no way to load lists only the candidates are offered (no Browse); with no create kit there is no "Add"', () => {
    const h = host(e, { options: null });
    expect(h.ids).not.toContain('intake-location-browse');
    expect(h.ids).not.toContain('intake-location-add');
    expect(h.ids).toContain('intake-location-cand-101');
  });
  it('a busy page disables every control', () => {
    const { kit } = stubKit();
    const h = host(e, { busy: true, create: kit });
    for (const id of ['intake-location-cand-101', 'intake-location-cand-102', 'intake-location-browse', 'intake-location-add']) expect(h.el(id)!.props.disabled, id).toBe(true);
    click(h.el('intake-location-cand-101'));
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('Greek: prompt, tabs and counts are Greek, no raw keys', () => {
    const h = host(e, { lang: 'el', states: browsing('my_locations') });
    expect(h.text).toMatch(/Οι τοποθεσίες μου \(5\)/);
    expect(h.text).toMatch(/Πελάτες \(8\)/);
    noRawKeys(h.text);
  });
  it('answers only with a whole-number id (an id the wire cannot carry is not sent)', () => {
    expect(locationAnswer('s1', '101')).toEqual({ step: 'location', stopKey: 's1', locationId: 101 });
    expect(locationAnswer('s1', 'abc')).toBeNull();
    expect(locationAnswer('s1', '1.5')).toBeNull();
    expect(locationAnswer(undefined, '101')).toBeNull();
  });
  it('the grey line gathers address, badges and distance', () => {
    expect(optionDetail({ id: '1', title: 'x', subtitle: 'Athens', badges: ['Pickup'], distanceKm: 3.24 })).toBe('Athens · Pickup · 3.2 km');
    expect(optionDetail({ id: '1', title: 'x' })).toBeUndefined();
  });
  it('a malformed location step (no stopKey / bad role) degrades to the text step', () => {
    expect(stepViewOf({ ...e, stopKey: undefined }).kind).toBe('text');
    expect(stepViewOf({ ...e, widget: { ...(e.widget as object), role: 'sideways' } as never }).kind).toBe('text');
    expect(stepViewOf({ ...e, widget: { ...(e.widget as object), candidates: 'x' } as never }).kind).toBe('text');
  });
});

describe('Create in place — a new site (§8.10)', () => {
  const e = ox.locationWidgetStep();
  it('"+ Add a new site" opens the existing form BENEATH the still-visible picker', async () => {
    const { kit } = stubKit();
    const h = host(e, { create: kit });
    expect(h.text).toContain('+ Add a new site');
    click(h.el('intake-location-add'));
    await flush();
    expect(kit.open).toHaveBeenCalledWith('location');
    expect(h.setCalls.find((c) => c.index === 7)!.value).toEqual({ kind: 'location', status: 'loading' });
    expect(h.setCalls.filter((c) => c.index === 7).pop()!.value).toEqual({ kind: 'location', status: 'ready', bundle: { stub: true } });
    const open = host(e, { create: kit, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }] });
    expect(open.ids).toContain('stub-form-location');
    expect(open.ids).toContain('intake-location-cand-101'); // the step before it is still there
    expect(open.el('intake-location-usenow')!.props.checked).toBe(true);
    expect(open.el('intake-location-cand-101')!.props.disabled).toBe(true); // …but nothing else can be pressed meanwhile
  });
  it('on save: the id comes from the CREATE response — R4 is NOT asked for the new name (§20.3) — and it answers when "use it right away" is ticked', async () => {
    const { kit, save } = stubKit();
    // R4 may serve a stale list for up to 60 s: this one does NOT know the new site, and must not matter.
    const fake = ox.fakeOptions();
    const h = host(e, { create: kit, options: fake, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }] });
    save({ kind: 'location', id: '777', name: 'Volos Cross-dock', city: 'Volos' });
    await flush();
    expect(fake.calls).toEqual([]);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'location', stopKey: 's1', locationId: 777 }, 'Volos Cross-dock');
  });
  it('un-ticked: the new site is pre-selected on the card instead of answering', async () => {
    const { kit, save } = stubKit();
    const h = host(e, { create: kit, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }, false] });
    save({ kind: 'location', id: '777', name: 'Volos Cross-dock', city: 'Volos' });
    await flush();
    expect(h.a.answer).not.toHaveBeenCalled();
    expect((h.setCalls.find((c) => c.index === 9)!.value as OptionItem).id).toBe('777');
    const shown = host(e, { create: kit, states: ['closed', 'my_locations', {}, [], '', {}, [], null, true, { id: '777', title: 'Volos Cross-dock' }] });
    expect(shown.el('intake-location-added')!.props['data-selected']).toBe('true');
    click(shown.el('intake-location-added'));
    expect(shown.a.answer).toHaveBeenCalledWith(e, { step: 'location', stopKey: 's1', locationId: 777 }, 'Volos Cross-dock');
  });
  it('does not need R4 at all after a save (it can be down)', async () => {
    const { kit, save } = stubKit();
    const failing = vi.fn(async () => { throw new Error('offline'); }) as unknown as ReturnType<typeof ox.fakeOptions>;
    const h = host(e, { create: kit, options: failing, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }] });
    save({ kind: 'location', id: '778', name: 'X', city: null });
    await flush();
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'location', stopKey: 's1', locationId: 778 }, 'X');
  });
  it('the form opens on the directory the gateway sent as widget.defaultTab (a customer is a site there, §20.3)', () => {
    const { kit, handlers } = stubKit();
    const cust = ox.locationWidgetStep({ defaultTab: 'customers' });
    host(cust, { create: kit, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }] });
    expect(handlers.current!.directory).toBe('customers'); // not the tab the shipper happens to be looking at
    const plain = stubKit();
    host(e, { create: plain.kit, states: ['closed', 'customers', {}, [], '', {}, [], { kind: 'location', status: 'ready', bundle: {} }] });
    expect(plain.handlers.current!.directory).toBe(defaultTabOf(e.widget as never));
  });
  it('a form that cannot be opened says so and lets the shipper go back; no add when the step cannot create', async () => {
    const { kit } = stubKit();
    kit.open.mockRejectedValueOnce(new Error('x'));
    const h = host(e, { create: kit });
    click(h.el('intake-location-add'));
    await flush();
    expect(h.setCalls.filter((c) => c.index === 7).pop()!.value).toEqual({ kind: 'location', status: 'error' });
    const err = host(e, { create: kit, states: ['closed', 'my_locations', {}, [], '', {}, [], { kind: 'location', status: 'error' }] });
    expect(err.text).toContain('That form could not be opened.');
    expect(host(ox.locationWidgetStep({ canCreate: false }), { create: kit }).ids).not.toContain('intake-location-add');
  });
});

/* ───────────────────────────── cargo + product tree ───────────────────────────── */

describe('cargoModel — rules', () => {
  it('numbers: one decimal mark, decimal comma accepted, no junk', () => {
    expect(parseQty('10')).toBe(10);
    expect(parseQty('2,5')).toBe(2.5);
    expect(parseQty('0')).toBeNull();
    expect(parseQty('-1')).toBeNull();
    expect(parseQty('1e3')).toBeNull();
    expect(parseQty('1.2345')).toBeNull();
    expect(parseQty('12345678')).toBeNull();
    expect(parseQty('')).toBeNull();
    expect(parseWeight('1 200')).toBe(1200);
    expect(parseWeight('1.2.3')).toBeNull();
    expect(parsePositive('007', 0)).toBe(7);
  });
  const derived = ox.cargoStep({});
  it('a derived weight posts NO weight; the gateway derives it (§5.1)', () => {
    const rows = cargoRowsOf(cargoSpec(derived));
    expect(rowIssues(rows[0]!)).toEqual([]);
    expect(rows[0]).toMatchObject({ mode: 'derived', weightKg: 1200, query: 'toilet paper' });
    expect(cargoAnswer('s1', rows)).toEqual({ step: 'cargo', stopKey: 's1', lines: [{ key: 'l1', productId: 1001, qty: 10, unit: 'EUR Pallets' }] });
  });
  it('ask: needs a weight; kg is pre-selected, tonnes is a tap away and goes on the wire as wUnit (the stored line is kg)', () => {
    const rows = cargoRowsOf(cargoSpec(ox.cargoStep({ weightMode: 'ask' })));
    expect(rowIssues(rows[0]!)).toEqual(['weight']);
    expect(rows[0]!.wUnit).toBe('Kgs');
    expect(cargoAnswer('s1', patchRow(rows, 0, { weight: '1,5', wUnit: 'Tonnes' }))).toEqual({ step: 'cargo', stopKey: 's1', lines: [{ key: 'l1', productId: 1001, qty: 10, unit: 'EUR Pallets', weight: 1.5, wUnit: 'Tonnes' }] });
  });
  it('pending_unit: the number is the line\'s pendingWeight; the unit is NOT guessed — it stays unselected until the shipper picks one', () => {
    const rows = cargoRowsOf(cargoSpec(ox.cargoStep({ weightMode: 'pending_unit' })));
    expect(rows[0]!.wUnit).toBeNull();
    expect(rows[0]!.weight).toBe('5');
    expect(rowIssues(rows[0]!)).toEqual(['wUnit']);
    expect(cargoAnswer('s1', rows)).toBeNull();
    expect(cargoAnswer('s1', patchRow(rows, 0, { wUnit: 'Tonnes' }))).toMatchObject({ lines: [{ weight: 5, wUnit: 'Tonnes' }] });
  });
  it('a unit the shipper said that is not on offer (unitPending) is not guessed either', () => {
    const rows = cargoRowsOf(cargoSpec(ox.cargoStep({ unitPending: true })));
    expect(rows[0]!.unit).toBeNull();
    expect(rowIssues(rows[0]!)).toEqual(['unit']);
  });
  it('a derived weight the shipper changes becomes their own number', () => {
    const rows = patchRow(cargoRowsOf(cargoSpec(derived)), 0, { ownWeight: true, weight: '900', wUnit: 'Kgs' });
    expect(rowWeightMode(rows[0]!)).toBe('ask');
    expect(cargoAnswer('s1', rows)).toMatchObject({ lines: [{ weight: 900, wUnit: 'Kgs' }] });
  });
  it('nothing is posted while ANY line is incomplete; the only unit on offer is pre-selected', () => {
    const rows = cargoRowsOf(cargoSpec(ox.cargoStep({ empty: true })));
    expect(rowIssues(rows[0]!).sort()).toEqual(['product', 'qty', 'unit', 'weight']);
    expect(cargoAnswer('s1', rows)).toBeNull();
    expect(cargoAnswer(undefined, cargoRowsOf(cargoSpec(derived)))).toBeNull();
    expect(cargoRowsOf({ kind: 'cargo', lines: [{}], unitOptions: ['Boxes'] })[0]!.unit).toBe('Boxes');
    expect(unitOptionsOf({})).toHaveLength(5);
    const two = cargoRowsOf(cargoSpec(ox.cargoStep({ secondLine: 'ask' })));
    expect(cargoAnswer('s1', two)).toBeNull(); // line 2 has no weight yet: the answer REPLACES the lines, so it is all or nothing
    expect(cargoAnswer('s1', patchRow(two, 1, { weight: '40' }))).toEqual({
      step: 'cargo', stopKey: 's1',
      lines: [{ key: 'l1', productId: 1001, qty: 10, unit: 'EUR Pallets' }, { key: 'l2', productId: 1011, qty: 4, unit: 'Boxes', weight: 40, wUnit: 'Kgs' }],
    });
  });
  it('the weight mode is per LINE (the widget-level one describes line 1 only)', () => {
    const rows = cargoRowsOf(cargoSpec(ox.cargoStep({ secondLine: 'ask' })));
    expect(rows.map((x) => x.mode)).toEqual(['derived', 'ask']);
    const noLineMode = cargoRowsOf({ kind: 'cargo', weightMode: 'ask', lines: [{ productId: '1' }, { productId: '2' }] });
    expect(noLineMode.map((x) => x.mode)).toEqual(['ask', 'ask']);
  });
  it('plausibility is per line: low / high say the per-unit figure, odd says the total; a null suggestKg means NO chip (§20.4)', () => {
    const note = (o: Parameters<typeof ox.cargoStep>[0]) => plausibilityNote(cargoRowsOf(cargoSpec(ox.cargoStep(o)))[0]!);
    expect(note({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: 5, suggestKg: 6000 } }))
      .toEqual({ key: 'cargo.weight.checkLow', params: { perUnit: 5, suggest: 6000 }, chipKg: 6000 });
    expect(note({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'high', kgPerUnit: 9000, suggestKg: 9000 } }))
      .toEqual({ key: 'cargo.weight.checkHigh', params: { perUnit: 9000, suggest: 9000 }, chipKg: 9000 });
    expect(note({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: null, suggestKg: 6000 } })?.params).toEqual({ perUnit: 5, suggest: 6000 }); // 50 kg ÷ 10
    expect(note({ weightMode: 'ask', weight: 0.5, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: 500 } }))
      .toEqual({ key: 'cargo.weight.checkOdd', params: { total: 0.5, suggest: 500 }, chipKg: 500 });
    expect(note({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: null } }))
      .toEqual({ key: 'cargo.weight.checkOdd.noSuggest', params: { total: 90000 }, chipKg: null });
    expect(note({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: 5, suggestKg: null } })?.chipKg).toBeNull();
    expect(note({ weightMode: 'ask', weight: 50 })).toBeNull();
    expect(note({ weightMode: 'ask', weight: 50, plausibility: { kind: 'weird' as never, kgPerUnit: 1, suggestKg: 1 } })).toBeNull();
  });
  it('words for the spent card', () => {
    const rows = withProduct(cargoRowsOf(cargoSpec(ox.cargoStep({ empty: true }))), 0, '501', 'Toilet paper');
    expect(cargoSummary(patchRow(rows, 0, { qty: '4', unit: 'Boxes' }))).toBe('4 Boxes Toilet paper');
  });
});

describe('Cargo widget — product tree, quantity, one Continue', () => {
  const e = ox.cargoStep({});
  it('shows the chosen product, its derived weight, and Continue posts ONE answer with every line', () => {
    const h = host(e);
    expect(h.text).toContain('What are we moving, and how much?');
    expect(textOf([h.el('intake-cargo-product-0')!])).toBe('Toilet paper 3-ply, 12 rolls');
    expect(h.text).toContain('Weight: 1200 kg (from the product)');
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(false);
    click(h.el('intake-cargo-continue'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'cargo', stopKey: 's1', lines: [{ key: 'l1', productId: 1001, qty: 10, unit: 'EUR Pallets' }] }, '10 EUR Pallets Toilet paper 3-ply, 12 rolls');
    noRawKeys(h.text);
  });
  it('Continue stays off until the line is complete', () => {
    const h = host(ox.cargoStep({ empty: true }));
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(true);
    click(h.el('intake-cargo-continue'));
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('an ambiguous match offers the SKUs and the TYPE ("any of this type"); one tap puts it on the line', () => {
    const amb = ox.cargoStep({ match: 'ambiguous' });
    const h = host(amb);
    expect(h.text).toContain('"toilet paper" matches several products');
    expect(h.ids).toEqual(expect.arrayContaining(['intake-cargo-cand-0-1001', 'intake-cargo-cand-0-1002', 'intake-cargo-cand-0-501']));
    expect(h.text).toContain('Any product of this type');
    click(h.el('intake-cargo-cand-0-501'));
    const rows = h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>;
    expect(rows[0]).toMatchObject({ productId: '501', productLabel: 'Toilet paper', ownWeight: true, weight: '' }); // a type row has no weight of its own: the shipper gives it
    expect(h.a.answer).not.toHaveBeenCalled(); // choosing a product is not the answer; Continue is
  });
  it('a type whose row is disabled is shown but cannot be pressed (no typeId fallback); its candidates list scrolls in its own box', () => {
    const h = host(ox.cargoStep({ match: 'ambiguous', disabledType: true }));
    expect(h.el('intake-cargo-cand-0-ty_misc_none')!.props.disabled).toBe(true);
    click(h.el('intake-cargo-cand-0-ty_misc_none'));
    expect(h.setCalls).toEqual([]);
    expect(h.el('intake-cargo-cands-0')!.props.style).toMatchObject({ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' });
  });
  it('no match says so and offers to browse', () => {
    const h = host(ox.cargoStep({ match: 'none' }));
    expect(h.text).toContain('I couldn\'t find "toothpaste" in your products');
    expect(h.ids).toContain('intake-cargo-browse-0');
  });
  it('browsing loads the whole tree once (both pages) and opens the picker for that line', async () => {
    const h = host(ox.cargoStep({ match: 'none' }));
    click(h.el('intake-cargo-browse-0'));
    await flush();
    expect(h.setCalls.find((c) => c.index === 1)!.value).toBe(0);
    expect(h.setCalls.find((c) => c.index === 2 && c.value === 'ready')).toBeTruthy();
    expect((h.setCalls.find((c) => c.index === 3)!.value as OptionsOk).total).toBe(13);
    expect(h.fake!.calls.filter((c) => c.kind === 'products')).toHaveLength(2);
  });
  const treeStates = async (rows?: unknown, expanded: string[] = [], query = '') =>
    [rows ?? cargoRowsOf(cargoSpec(ox.cargoStep({ match: 'none' }))), 0, 'ready', await allProducts(), expanded, query];
  it('the tree is collapsed: categories only, each with its TRUE count; total is the true total', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates() });
    expect(h.text).toContain('13 products');
    expect(h.el('intake-cargo-list-group-cat_paper')!.props['data-open']).toBe('false');
    expect(textOf([h.el('intake-cargo-list-count-cat_paper')!])).toBe('5');
    expect(textOf([h.el('intake-cargo-list-count-cat_bev')!])).toBe('4');
    expect(textOf([h.el('intake-cargo-list-count-cat_clean')!])).toBe('4');
    expect(h.ids.filter((i) => i.includes('-opt-'))).toEqual([]);
    expect(h.ids).not.toContain('intake-cargo-list-group-ty_toilet');
    expect(h.ids).toContain('intake-cargo-search'); // 13 > 8: worth a search box
    expect(h.el('intake-cargo-list')!.props.style).toMatchObject({ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' }); // MS3-399: scrolls in its own box
  });
  it('Category › Type › SKU: opening a category shows types, opening a type shows its SKUs', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates(undefined, ['g:cat_paper', 'g:ty_toilet']) });
    expect(h.ids).toEqual(expect.arrayContaining(['intake-cargo-list-group-ty_toilet', 'intake-cargo-list-group-ty_kitchen', 'intake-cargo-list-opt-1001', 'intake-cargo-list-opt-1003']));
    expect(h.ids).not.toContain('intake-cargo-list-opt-1011'); // Kitchen roll is still closed
    expect(h.ids).not.toContain('intake-cargo-list-opt-501'); // the type row is the group's pick, not a SKU row
  });
  it('a TYPE can be chosen as well as a SKU — and answers with the id of its own type row, not the group id (§20.5)', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates(undefined, ['g:cat_paper', 'g:ty_toilet']) });
    expect(h.ids).toContain('intake-cargo-list-pick-ty_toilet');
    expect(h.ids).not.toContain('intake-cargo-list-pick-cat_paper'); // a category is not a choice
    click(h.el('intake-cargo-list-pick-ty_toilet'));
    const picked = (h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]!;
    expect(picked).toMatchObject({ productId: '501', productLabel: 'Toilet paper', ownWeight: true });
    expect(picked.productId).not.toBe('ty_toilet');
    expect(h.setCalls.find((c) => c.index === 1)!.value).toBeNull();
    click(h.el('intake-cargo-list-opt-1003'));
    expect((h.setCalls.filter((c) => c.index === 0).pop()!.value as ReturnType<typeof cargoRowsOf>)[0]).toMatchObject({ productId: '1003' });
  });
  it('a type with a disabled type row: the pick is shown disabled and nothing is posted; its SKUs still work', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates(undefined, ['g:cat_clean', 'g:ty_misc']) });
    expect(h.el('intake-cargo-list-pick-ty_misc')!.props.disabled).toBe(true);
    click(h.el('intake-cargo-list-pick-ty_misc'));
    expect(h.setCalls).toEqual([]);
    expect(h.el('intake-cargo-list-pick-ty_detergent')!.props.disabled).toBe(false);
    click(h.el('intake-cargo-list-opt-1031'));
    expect((h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]).toMatchObject({ productId: '1031' });
  });
  it('searching finds a SKU inside closed groups', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates(undefined, [], 'jumbo') });
    expect(h.ids).toEqual(expect.arrayContaining(['intake-cargo-list-group-cat_paper', 'intake-cargo-list-group-ty_toilet', 'intake-cargo-list-opt-1003']));
    expect(h.ids).not.toContain('intake-cargo-list-group-cat_bev');
  });
  it('a type the server counted but did not send (Water, 4) is fetched when opened', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: await treeStates(undefined, ['g:cat_bev']) });
    expect(textOf([h.el('intake-cargo-list-count-ty_water')!])).toBe('4');
    click(h.el('intake-cargo-list-group-ty_water'));
    await flush();
    expect(h.fake!.calls.some((c) => c.kind === 'products' && c.query.group === 'ty_water')).toBe(true);
    expect(h.setCalls.some((c) => c.index === 6)).toBe(true);
  });
  it('a failed tree load says so, with Try again', () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: [cargoRowsOf({ kind: 'cargo', lines: [{}] }), 0, 'error'] });
    expect(h.text).toContain('The list could not be loaded');
  });
  it('ask: weight box + kg/tonnes; an invalid weight says why; Continue waits', () => {
    const ask = ox.cargoStep({ weightMode: 'ask' });
    const rows = cargoRowsOf(cargoSpec(ask));
    const h = host(ask, { states: [patchRow(rows, 0, { weight: '12x' })] });
    expect(h.text).toContain('How much does the load weigh in total?');
    expect(h.ids).toEqual(expect.arrayContaining(['intake-cargo-wunit-0-kg', 'intake-cargo-wunit-0-tonnes']));
    expect(h.el('intake-cargo-weight-invalid-0')).toBeTruthy();
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(true);
    const ok = host(ask, { states: [patchRow(rows, 0, { weight: '6000' })] });
    expect(ok.el('intake-cargo-continue')!.props.disabled).toBe(false);
    click(ok.el('intake-cargo-continue'));
    expect(ok.a.answer.mock.calls[0]![1]).toMatchObject({ lines: [{ weight: 6000, wUnit: 'Kgs' }] });
  });
  it('pending_unit: neither kg nor tonnes is selected, and the question names the number', () => {
    const p = ox.cargoStep({ weightMode: 'pending_unit' });
    const rows = cargoRowsOf(cargoSpec(p));
    const h = host(p, { states: [patchRow(rows, 0, { weight: '5' })] });
    expect(h.text).toContain('Is 5 in kilograms or tonnes?');
    expect(h.el('intake-cargo-wunit-0-kg')!.props['aria-pressed']).toBe(false);
    expect(h.el('intake-cargo-wunit-0-tonnes')!.props['aria-pressed']).toBe(false);
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(true);
    click(h.el('intake-cargo-wunit-0-tonnes'));
    expect((h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]!.wUnit).toBe('Tonnes');
  });
  it('a derived weight can be changed', () => {
    const h = host(e);
    click(h.el('intake-cargo-weight-change-0'));
    expect((h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]).toMatchObject({ ownWeight: true });
  });
  it('plausibility, per line: low says the per-unit figure and the chip is one tap', () => {
    const s1 = host(ox.cargoStep({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: 5, suggestKg: 6000 } }));
    expect(textOf([s1.el('intake-cargo-plaus-0')!])).toContain('5 kg per pallet');
    expect(s1.text).toContain('Use 6000 kg instead');
    click(s1.el('intake-cargo-suggest-0'));
    expect((s1.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]).toMatchObject({ weight: '6000', wUnit: 'Kgs', ownWeight: true });
    const hi = host(ox.cargoStep({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'high', kgPerUnit: 9000, suggestKg: 9000 } }));
    expect(textOf([hi.el('intake-cargo-plaus-0')!])).toContain('9000 kg per pallet');
    noRawKeys(hi.text);
  });
  it('plausibility "odd" says the total (EN and EL); with a null suggestKg there is the warning and NO chip', () => {
    const odd = host(ox.cargoStep({ weightMode: 'ask', weight: 0.5, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: 500 } }));
    expect(textOf([odd.el('intake-cargo-plaus-0')!])).toContain('0.5 kg looks unusual for this line');
    expect(odd.ids).toContain('intake-cargo-suggest-0');
    const bare = host(ox.cargoStep({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: null } }));
    expect(textOf([bare.el('intake-cargo-plaus-0')!])).toContain('90000 kg looks unusual for this line. Please check it.');
    expect(bare.ids).not.toContain('intake-cargo-suggest-0');
    const el = host(ox.cargoStep({ weightMode: 'ask', weight: 90000, plausibility: { kind: 'odd', kgPerUnit: null, suggestKg: null } }), { lang: 'el' });
    expect(textOf([el.el('intake-cargo-plaus-0')!])).toContain('ασυνήθιστα');
    noRawKeys(el.text); noRawKeys(odd.text);
  });
  it('plausibility belongs to its own line: the other line shows none', () => {
    const h = host(ox.cargoStep({ weightMode: 'ask', weight: 50, plausibility: { kind: 'low', kgPerUnit: 5, suggestKg: 6000 }, secondLine: 'ask' }));
    expect(h.ids).toContain('intake-cargo-plaus-0');
    expect(h.ids).not.toContain('intake-cargo-plaus-1');
  });
  it('two lines: Continue waits for BOTH, then posts them together (the answer replaces the lines)', () => {
    const two = ox.cargoStep({ secondLine: 'ask' });
    expect(host(two).el('intake-cargo-continue')!.props.disabled).toBe(true);
    const ready = host(two, { states: [patchRow(cargoRowsOf(cargoSpec(two)), 1, { weight: '40' })] });
    expect(ready.el('intake-cargo-continue')!.props.disabled).toBe(false);
    click(ready.el('intake-cargo-continue'));
    expect(ready.a.answer).toHaveBeenCalledTimes(1);
    expect(ready.a.answer.mock.calls[0]![1]).toMatchObject({ lines: [{ key: 'l1', productId: 1001 }, { key: 'l2', productId: 1011, weight: 40, wUnit: 'Kgs' }] });
  });
  it('a unit that is pending is left blank for the shipper to choose', () => {
    const h = host(ox.cargoStep({ unitPending: true }));
    expect(h.el('intake-cargo-unit-0')!.props.value).toBe('');
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(true);
  });
  it('quantity and unit are fields; an invalid quantity is called out', () => {
    const rows = cargoRowsOf(cargoSpec(e));
    const h = host(e, { states: [patchRow(rows, 0, { qty: 'ten' })] });
    expect(h.el('intake-cargo-qty-invalid-0')).toBeTruthy();
    expect(h.el('intake-cargo-continue')!.props.disabled).toBe(true);
    typed(h, 'intake-cargo-qty-0', '12');
    expect((h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]!.qty).toBe('12');
    typed(h, 'intake-cargo-unit-0', 'Boxes');
    expect((h.setCalls.filter((c) => c.index === 0).pop()!.value as ReturnType<typeof cargoRowsOf>)[0]!.unit).toBe('Boxes');
  });
  it('busy disables everything; Greek shows Greek', () => {
    const b = host(e, { busy: true });
    for (const id of ['intake-cargo-continue', 'intake-cargo-qty-0', 'intake-cargo-unit-0', 'intake-cargo-change-0']) expect(b.el(id)!.props.disabled, id).toBe(true);
    const g = host(ox.cargoStep({ match: 'ambiguous' }), { lang: 'el' });
    expect(g.text).toContain('Οποιοδήποτε προϊόν αυτού του τύπου');
    expect(g.text).toContain('Συνέχεια');
    noRawKeys(g.text);
  });
  it('a cargo step without a stopKey is the text step; without lines it starts with one empty line', () => {
    expect(stepViewOf({ ...e, stopKey: undefined }).kind).toBe('text');
    const v = stepViewOf({ ...e, widget: { kind: 'cargo' } as never });
    expect(v.kind === 'cargo' && v.spec.lines).toEqual([]);
    expect(cargoRowsOf({ kind: 'cargo', lines: [] })).toHaveLength(1);
  });
});

describe('Create in place — a new product (§8.10)', () => {
  const none = ox.cargoStep({ match: 'none' });
  const rowsOf = () => cargoRowsOf(cargoSpec(none));
  const ready = (extra: unknown[] = []) => [patchRow(rowsOf(), 0, { qty: '10', unit: 'Boxes', weight: '', wUnit: null }), 0, 'ready', undefined, [], '', {}, [], { kind: 'product', status: 'ready', bundle: {} }, ...extra];
  it('"+ Add a new product" opens the product form under the tree; the line above stays', async () => {
    const { kit } = stubKit();
    const open = host(none, { create: kit, states: ready() });
    expect(open.ids).toContain('stub-form-product');
    expect(open.ids).toContain('intake-cargo-row-0');
    const h = host(none, { create: kit, states: [rowsOf(), 0, 'closed'] });
    click(h.el('intake-cargo-add'));
    await flush();
    expect(kit.open).toHaveBeenCalledWith('product');
    expect(h.setCalls.filter((c) => c.index === 8).pop()!.value).toMatchObject({ kind: 'product', status: 'ready' });
  });
  it('on save the new product is put on the line and NOTHING is posted — not even when the line is otherwise complete (§20.12)', async () => {
    const { kit, save } = stubKit();
    const complete = [patchRow(rowsOf(), 0, { qty: '10', unit: 'Boxes', weight: '5', wUnit: 'Kgs' }), 0, 'ready', undefined, [], '', {}, [], { kind: 'product', status: 'ready', bundle: {} }];
    const h = host(none, { create: kit, states: complete });
    save({ kind: 'product', id: '9001', name: 'Mop heads' });
    await flush();
    expect((h.setCalls.find((c) => c.index === 0)!.value as ReturnType<typeof cargoRowsOf>)[0]).toMatchObject({ productId: '9001', productLabel: 'Mop heads' });
    expect(h.a.answer).not.toHaveBeenCalled();
    expect(h.fake!.calls).toEqual([]); // the id is the create response's; R4 is not asked
  });
  it('the shipper then presses Continue: the one answer carries the new product', () => {
    const rows = withProduct(patchRow(rowsOf(), 0, { qty: '10', unit: 'Boxes', weight: '5', wUnit: 'Kgs' }), 0, '9001', 'Mop heads');
    const h = host(none, { states: [rows] });
    click(h.el('intake-cargo-continue'));
    expect(h.a.answer).toHaveBeenCalledWith(none, { step: 'cargo', stopKey: 's1', lines: [{ key: 'l1', productId: 9001, qty: 10, unit: 'Boxes', weight: 5, wUnit: 'Kgs' }] }, '10 Boxes Mop heads');
  });
  it('no create kit / canCreate false ⇒ no "Add a new product"', () => {
    const { kit } = stubKit();
    expect(host(none, { states: [rowsOf(), 0, 'closed'] }).ids).not.toContain('intake-cargo-add');
    expect(host(ox.cargoStep({ match: 'none', canCreate: false }), { create: kit, states: [rowsOf(), 0, 'closed'] }).ids).not.toContain('intake-cargo-add');
  });
});

/* ───────────────────────────── window ───────────────────────────── */

describe('windowModel', () => {
  it('validates dates and times', () => {
    expect(validDate('2026-10-23')).toBe(true);
    expect(validDate('2026-02-30')).toBe(false);
    expect(validDate('23/10/2026')).toBe(false);
    expect(validTime('08:00')).toBe(true);
    expect(validTime('24:00')).toBe(false);
    expect(validTime('8:00')).toBe(false);
  });
  it('the end must be after the start; blank times are fine', () => {
    expect(windowIssues({ date: '2026-10-23', timeFrom: '12:00', timeTo: '12:00' })).toEqual(['order']);
    expect(windowIssues({ date: '2026-10-23', timeFrom: '12:00', timeTo: '08:00' })).toEqual(['order']);
    expect(windowIssues({ date: '2026-10-23', timeFrom: '', timeTo: '' })).toEqual([]);
    expect(windowIssues({ date: '', timeFrom: '08:00', timeTo: '' })).toEqual(['date']);
  });
  it('a past date is a warning, not an error', () => {
    expect(isPastDate('2026-10-01', '2026-10-16')).toBe(true);
    expect(isPastDate('2026-10-16', '2026-10-16')).toBe(false);
    expect(isPastDate('2026-10-01', undefined, '2026-10-16')).toBe(true);
    expect(isPastDate('2026-10-01', null, '2026-10-16')).toBe(true); // §20.8: minDate may be null — then today is the limit
    expect(isPastDate('2026-10-20', null, '2026-10-16')).toBe(false);
    expect(windowIssues({ date: '2026-10-01', timeFrom: '08:00', timeTo: '' })).toEqual([]);
  });
  it('the answer carries nulls for a blank time, and the draft starts from 08:00', () => {
    expect(windowAnswer('s1', { date: '2026-10-23', timeFrom: '08:00', timeTo: '' })).toEqual({ step: 'window', stopKey: 's1', date: '2026-10-23', timeFrom: '08:00', timeTo: null });
    expect(windowAnswer('s1', { date: '', timeFrom: '08:00', timeTo: '' })).toBeNull();
    expect(windowDraftOf({ kind: 'window', role: 'pickup' }).timeFrom).toBe(DEFAULT_FROM);
    expect(windowText({ date: '2026-10-23', timeFrom: '08:00', timeTo: '12:00' })).toBe('2026-10-23 08:00–12:00');
  });
});

describe('Window widget', () => {
  const e = ox.windowStep();
  it('is pre-filled (date, 08:00) and Continue posts the one answer', () => {
    const h = host(e);
    expect(h.text).toContain('When can the truck load?');
    expect(h.el('intake-window-date')!.props.value).toBe('2026-10-23');
    expect(h.el('intake-window-from')!.props.value).toBe('08:00');
    click(h.el('intake-window-continue'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'window', stopKey: 's1', date: '2026-10-23', timeFrom: '08:00', timeTo: null }, '2026-10-23 08:00');
    noRawKeys(h.text);
  });
  it('presets set the from/to times in one tap', () => {
    const h = host(e);
    click(h.el('intake-window-preset-1200-1700'));
    // [3] is "Any time": a preset is a time slot, so it switches that off first.
    expect(h.setCalls.map((c) => [c.index, c.value])).toEqual([[3, false], [1, '12:00'], [2, '17:00']]);
  });
  it('MS3-408: "Any time" hides the times and posts anyTime; a drop-off may leave the day open', () => {
    const spec = { ...(e.widget as Record<string, unknown>), anyTimeLabel: { key: 'window.anyTime', text: 'Any time' }, anyTimeNeedsDate: false };
    const drop = { ...e, stopRole: 'dropoff' as const, widget: { ...spec, role: 'dropoff', date: null } as typeof e.widget };
    const h = host(drop, { states: ['', '08:00', '', true] });
    expect(h.el('intake-window-from')).toBeUndefined();
    click(h.el('intake-window-continue'));
    expect(h.a.answer).toHaveBeenCalledWith(drop, { step: 'window', stopKey: 's1', date: '', timeFrom: null, anyTime: true }, 'any time');
  });
  it('MS3-408: a pickup set to "Any time" still needs its day', () => {
    const spec = { ...(e.widget as Record<string, unknown>), anyTimeLabel: { key: 'window.anyTime', text: 'Any time' }, anyTimeNeedsDate: true, date: null };
    const pick = { ...e, widget: spec as typeof e.widget };
    const h = host(pick, { states: ['', '08:00', '', true] });
    expect(h.el('intake-window-continue')!.props.disabled).toBe(true);
  });
  it('minDate null is fine, and the date field has no `min` (a past date is chosen and warned about, not refused)', () => {
    const h = host(ox.windowStep({ minDate: null }));
    expect(h.el('intake-window-date')!.props.min).toBeUndefined();
    expect(h.el('intake-window-continue')!.props.disabled).toBe(false);
    expect(host(e).el('intake-window-date')!.props.min).toBeUndefined();
  });
  it('no date ⇒ Continue is off', () => {
    const h = host(ox.windowStep({ date: null }));
    expect(h.el('intake-window-continue')!.props.disabled).toBe(true);
  });
  it('a past date warns but does not block (a draft may have one)', () => {
    const h = host(ox.windowStep({ date: '2026-10-01' }));
    expect(h.text).toContain('This date is in the past. You can save a draft, but to publish choose a new date.');
    expect(h.el('intake-window-continue')!.props.disabled).toBe(false);
  });
  it('an end before the start says so and blocks Continue', () => {
    const h = host(e, { states: ['2026-10-23', '12:00', '08:00'] });
    expect(h.el('intake-window-order')!.props.role).toBe('alert');
    expect(h.text).toContain('The end time must be after the start time.');
    expect(h.el('intake-window-continue')!.props.disabled).toBe(true);
  });
  it('drop-off wording, busy, Greek', () => {
    expect(host(ox.windowStep({ role: 'dropoff' })).text).toContain('When should it be delivered?');
    expect(host(e, { busy: true }).el('intake-window-continue')!.props.disabled).toBe(true);
    const g = host(e, { lang: 'el' });
    expect(g.text).toContain('Συνέχεια');
    noRawKeys(g.text);
  });
  it('typing a date and picking times set state', () => {
    const h = host(e);
    typed(h, 'intake-window-date', '2026-11-02');
    typed(h, 'intake-window-to', '13:30');
    expect(h.setCalls).toEqual([{ index: 0, value: '2026-11-02' }, { index: 2, value: '13:30' }]);
  });
  it('a window step with no stopKey or a bad role is the text step', () => {
    expect(stepViewOf({ ...e, stopKey: undefined }).kind).toBe('text');
    expect(stepViewOf({ ...e, widget: { ...(e.widget as object), role: 'x' } as never }).kind).toBe('text');
  });
});

/* ───────────────────────────── more pickups / pick orders ───────────────────────────── */

describe('More pickups widget', () => {
  const e = ox.morePickupsStep();
  it('three one-tap answers, "No, that\'s all" suggested', () => {
    const h = host(e);
    expect(h.text).toContain('Anything else to pick up?');
    expect(h.el('intake-morepickups-no')!.props['data-selected']).toBe('true');
    expect(h.ids).toContain('intake-morepickups-no-suggested');
    expect(h.el('intake-morepickups-same_location')!.props['data-selected']).toBe('false');
    click(h.el('intake-morepickups-same_location'));
    click(h.el('intake-morepickups-another_location'));
    click(h.el('intake-morepickups-no'));
    expect(h.a.answer.mock.calls.map((c) => c[1])).toEqual([
      { step: 'more_pickups', choice: 'same_location' }, { step: 'more_pickups', choice: 'another_location' }, { step: 'more_pickups', choice: 'no' },
    ]);
    noRawKeys(h.text);
  });
  it('busy disables all three; Greek is Greek', () => {
    const b = host(e, { busy: true });
    for (const c of ['same_location', 'another_location', 'no']) expect(b.el(`intake-morepickups-${c}`)!.props.disabled).toBe(true);
    expect(host(e, { lang: 'el' }).text).toContain('Όχι, αυτά');
  });
  it('the spent card keeps the choice in words', () => {
    expect(answerLabel(e, { step: 'more_pickups', choice: 'no' })).toMatchObject({ key: 'morePickups.no', fallbackText: "No, that's all" });
    expect(answerLabel(e, { step: 'more_pickups', choice: 'another_location' })!.key).toBe('morePickups.other');
  });
});

describe('Pick orders widget', () => {
  const e = ox.pickOrdersListStep();
  it('without the first page of orders it is STILL the orders step — the widget draws its own waiting state (QA-1; was a bare text step)', () => {
    const v = stepViewOf(fx.pickOrdersStep());
    expect(v.kind).toBe('pick_orders');
    expect(v.kind === 'pick_orders' && v.spec.orders).toBeUndefined();
    expect(stepViewOf(e).kind).toBe('pick_orders');
  });
  it('lists orders by customer, collapsed, with true counts; Continue needs a tick', () => {
    const h = host(e);
    expect(h.text).toContain('3 orders');
    expect(h.el('intake-orders-list-group-cust_alpha')!.props['data-open']).toBe('false');
    expect(textOf([h.el('intake-orders-list-count-cust_alpha')!])).toBe('2');
    expect(h.el('intake-orders-continue')!.props.disabled).toBe(true);
    noRawKeys(h.text);
  });
  it('ticking several orders posts them in one answer', () => {
    const h = host(e, { states: [['o_9001', 'o_9010'], ['g:cust_alpha', 'g:cust_beta']] });
    expect(h.el('intake-orders-list-opt-o_9001')!.props['data-selected']).toBe('true');
    expect(h.text).toContain('Use 2 selected');
    click(h.el('intake-orders-continue'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'pick_orders', orderIds: ['o_9001', 'o_9010'] });
    click(h.el('intake-orders-list-opt-o_9002'));
    expect(h.setCalls.find((c) => c.index === 0)!.value).toEqual(['o_9001', 'o_9010', 'o_9002']);
    click(h.el('intake-orders-list-opt-o_9001'));
    expect(h.setCalls.filter((c) => c.index === 0).pop()!.value).toEqual(['o_9010']);
  });
  it('busy disables; Greek', () => {
    expect(host(e, { busy: true, states: [['o_9001']] }).el('intake-orders-continue')!.props.disabled).toBe(true);
    const g = host(e, { lang: 'el' });
    expect(g.text).toContain('3 παραγγελίες');
  });
});

/* ───────────────────────────── history labels / locale ───────────────────────────── */

describe('answer labels for the stop steps', () => {
  it('location: the name shown, else the candidate with that id, else the id', () => {
    const e = ox.locationWidgetStep();
    expect(answerLabel(e, { step: 'location', stopKey: 's1', locationId: 101 }, 'Athens DC')).toEqual({ key: 'history.location', params: { name: 'Athens DC' }, fallbackText: 'Site: Athens DC' });
    expect(answerLabel(e, { step: 'location', stopKey: 's1', locationId: 102 })!.params).toEqual({ name: 'Athens Warehouse' });
    expect(answerLabel(e, { step: 'location', stopKey: 's1', locationId: 5 })!.params).toEqual({ name: '#5' });
  });
  it('cargo and window', () => {
    expect(answerLabel(ox.cargoStep(), { step: 'cargo', stopKey: 's1', lines: [] }, '4 Boxes Soap')).toMatchObject({ key: 'history.cargo', params: { summary: '4 Boxes Soap' } });
    expect(answerLabel(ox.windowStep(), { step: 'window', stopKey: 's1', date: '2026-10-23', timeFrom: null }, '2026-10-23 08:00')).toMatchObject({ key: 'history.window', params: { when: '2026-10-23 08:00' } });
  });
});

describe('locale keys of the stop widgets', () => {
  type Tree = { [k: string]: string | Tree };
  const get = (lang: Lang, key: string): unknown => feKey(key).split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), (LOCALES[lang] as unknown as { vagonai: { shipment: { intake: Tree } } }).vagonai.shipment.intake);
  const sources = import.meta.glob('./widgets/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  const asked = new Set<string>();
  for (const src of Object.values(sources)) {
    for (const m of src.matchAll(/(?:chrome\(\s*ui\s*,\s*|label\()\s*'([A-Za-z][\w.]*)'/g)) asked.add(m[1]!);
  }
  const extra = ['location.tab.mine', 'location.tab.customers', 'cargo.units.eurPallets', 'cargo.units.usPallets', 'cargo.units.boxes', 'cargo.units.units', 'cargo.units.bigBags',
    'location.pickup.prompt', 'location.dropoff.prompt', 'window.pickup.prompt', 'window.dropoff.prompt', 'location.roleMismatch', 'window.dropBeforePickup',
    'cargo.weight.unitUnknown', 'cargo.weight.checkLow', 'cargo.weight.checkHigh', 'cargo.weight.checkOdd', 'cargo.weight.checkOdd.noSuggest', 'location.best', 'location.bestOf', 'cargo.prompt', 'morePickups.prompt'];
  it('every key the stop widgets ask for (and every contract key of these steps) exists in EN and EL', () => {
    expect(asked.size).toBeGreaterThan(30);
    for (const k of [...asked, ...extra]) {
      expect(get('en', k), `en: ${k}`).toBeTypeOf('string');
      expect(get('el', k), `el: ${k}`).toBeTypeOf('string');
    }
  });
  it('the contract\'s leaf-and-parent key cargo.weight.checkOdd.noSuggest is stored as the camel-case sibling', () => {
    expect(feKey('cargo.weight.checkOdd.noSuggest')).toBe('cargo.weight.checkOddNoSuggest');
    expect(get('en', 'cargo.weight.checkOdd')).toBeTypeOf('string');
  });
  it('the unit names cover every quantity unit of the wire', async () => {
    const { QTY_UNITS, UNIT_KEY } = await import('./cargoModel');
    for (const u of QTY_UNITS) expect(get('en', `cargo.units.${UNIT_KEY[u]}`)).toBeTypeOf('string');
  });
});

describe('preview scenarios', () => {
  it('every new scenario builds a step the right widget draws; the old names still exist', async () => {
    const mod = await import('./devPreview');
    const names = ['location-pickup', 'location-dropoff', 'location-noexact', 'cargo-tree', 'cargo-ask', 'cargo-pending-unit', 'cargo-ambiguous', 'cargo-none', 'window', 'window-dropoff', 'more-pickups', 'pick-orders-list', 'partners-pick', 'vehicle-tight', 'vehicle-toobig'];
    const kindOf = (n: string) => {
      const p = mod.devPreview(`?intakePreview=${n}`);
      expect(p, n).not.toBeNull();
      const ev = (p!.thread[0] as { intake: { event: IntakeStepEvent } }).intake.event;
      return stepViewOf(ev).kind;
    };
    expect(names.map(kindOf)).toEqual(['location', 'location', 'location', 'cargo', 'cargo', 'cargo', 'cargo', 'cargo', 'window', 'window', 'more_pickups', 'pick_orders', 'channel', 'vehicle', 'vehicle']);
    for (const old of ['gate', 'describe', 'upload', 'text', 'express', 'editing', 'discard', 'summary', 'pick-orders', 'vehicle', 'channel', 'order-value', 'done']) expect(mod.devPreview(`?intakePreview=${old}`), old).not.toBeNull();
    // r2 (§20): new names only; none of the above changed
    const r2 = ['location-bestof', 'cargo-plaus-low', 'cargo-plaus-high', 'cargo-plaus-odd', 'cargo-plaus-nochip', 'cargo-two-lines', 'cargo-disabled-type', 'channel-nopreselect', 'vehicle-nofit', 'window-nomin'];
    expect(r2.map(kindOf)).toEqual(['location', 'cargo', 'cargo', 'cargo', 'cargo', 'cargo', 'cargo', 'channel', 'vehicle', 'window']);
    expect(kindOf('text')).toBe('text');
    expect(kindOf('express')).toBe('text');
    expect(kindOf('pick-orders')).toBe('pick_orders'); // QA-1: no longer a bare title
    expect(['pick-orders-loading', 'pick-orders-empty', 'pick-orders-error'].map(kindOf)).toEqual(['pick_orders', 'pick_orders', 'pick_orders']);
  });
  it('the scripted gateway walks location → cargo → window → more pickups → drop-off → window → truck, and serves R4 lists', async () => {
    const { previewApi } = await import('./devPreview');
    const ans = async (e: IntakeStepEvent, answer: never) => (await previewApi.answer('int_9f1c', { stepId: e.stepId, rev: e.rev, answer })) as { event: IntakeStepEvent };
    let r = await ans(ox.locationWidgetStep(), { step: 'location', stopKey: 's1', locationId: 101 } as never);
    expect(r.event.step).toBe('cargo');
    r = await ans(r.event, { step: 'cargo', stopKey: 's1', lines: [] } as never);
    expect(r.event.step).toBe('window');
    r = await ans(r.event, { step: 'window', stopKey: 's1', date: '2026-10-23', timeFrom: null } as never);
    expect(r.event.step).toBe('more_pickups');
    r = await ans(r.event, { step: 'more_pickups', choice: 'no' } as never);
    expect(r.event.step === 'location' && stepViewOf(r.event).kind === 'location' && (r.event.widget as { role: string }).role).toBe('dropoff');
    r = await ans(r.event, { step: 'location', stopKey: 's2', locationId: 201 } as never);
    expect(r.event.step).toBe('window');
    r = await ans(r.event, { step: 'window', stopKey: 's2', date: '2026-10-24', timeFrom: null } as never);
    expect(r.event.step).toBe('vehicle');
    const res = await previewApi.options!('int_9f1c', 'products', {});
    expect(res.ok && res.total).toBe(13);
  });
});

/* ───────────────────────────── v0.2.3 (§20) — small rulings and the list rules ───────────────────────────── */

describe('Location widget — best matches (§20.9)', () => {
  it('a flat "Best matches" heading; "N of M" only when the gateway sends totalCandidates AND it is more than shown', () => {
    expect(textOf([host(ox.locationWidgetStep()).el('intake-location-best')!])).toBe('Best matches');
    expect(textOf([host(ox.locationWidgetStep({ totalCandidates: 23 })).el('intake-location-best')!])).toBe('Best matches (2 of 23)');
    expect(textOf([host(ox.locationWidgetStep({ totalCandidates: 2 })).el('intake-location-best')!])).toBe('Best matches');
    expect(textOf([host(ox.locationWidgetStep({ totalCandidates: 23 }), { lang: 'el' }).el('intake-location-best')!])).toBe('Καλύτερες αντιστοιχίες (2 από 23)');
  });
  it('no grouping inside the block, a browse-all option next to it, and no heading when there is nothing to show', () => {
    const h = host(ox.locationWidgetStep({ totalCandidates: 23 }));
    expect(h.ids.filter((i) => /^intake-location-cand-\d+$/.test(i))).toEqual(['intake-location-cand-101', 'intake-location-cand-102']);
    expect(h.ids).toContain('intake-location-browse');
    expect(host(ox.locationWidgetStep({ candidates: [] })).ids).not.toContain('intake-location-best');
  });
  it('the candidates scroll in their own box (MS3-399)', () => {
    expect(host(ox.locationWidgetStep()).el('intake-location')!.props.style).toMatchObject({ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' });
  });
});

describe('every WP3b list: collapsed by default (MS3-396) and scrolls in its own box without moving the page (MS3-399)', () => {
  const sources = import.meta.glob(['./widgets/*.tsx', './*.tsx'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  it('no widget calls scrollIntoView / scrollTo / focus-scrolls the chat', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    for (const [file, src] of Object.entries(sources)) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/scrollIntoView|\.scrollTo\(|window\.scroll/);
    }
  });
  it('the grouped list has a bounded height and scrolls', async () => {
    const lists = [
      host(ox.cargoStep({ match: 'none' }), { states: [cargoRowsOf(cargoSpec(ox.cargoStep({ match: 'none' }))), 0, 'ready', await allProducts(), [], ''] }).el('intake-cargo-list'),
      host(ox.locationWidgetStep(), { states: ['ready', 'my_locations', { my_locations: mine() }] }).el('intake-location-list'),
    ];
    for (const l of lists) expect(l!.props.style).toMatchObject({ maxHeight: LIST_MAX_HEIGHT, overflowY: 'auto' });
  });
  it('collapsed by default: no group is open and no option row is drawn until one is opened', async () => {
    const h = host(ox.cargoStep({ match: 'none' }), { states: [cargoRowsOf(cargoSpec(ox.cargoStep({ match: 'none' }))), 0, 'ready', await allProducts(), [], ''] });
    expect(h.ids.filter((i) => i.includes('-group-')).map((i) => h.el(i)!.props['data-open'])).toEqual(['false', 'false', 'false']);
    expect(h.ids.filter((i) => i.includes('-opt-'))).toEqual([]);
    const loc = host(ox.locationWidgetStep(), { states: ['ready', 'my_locations', { my_locations: mine() }] });
    expect(loc.ids.filter((i) => i.startsWith('intake-location-list-group-')).every((i) => loc.el(i)!.props['data-open'] === 'false')).toBe(true);
    expect(loc.ids.filter((i) => i.includes('-opt-'))).toEqual([]);
  });
});

describe('small v0.2.3 rulings — vehicle.warning, channel.defaultChoice, alternatives[].fit', () => {
  const channel = (o: Parameters<typeof fx.channelStep>[0]) => {
    const v = stepViewOf(fx.channelStep(o));
    if (v.kind !== 'channel') throw new Error('not channel');
    return channelDefaultOf(v.spec);
  };
  it('defaultChoice "private_all" pre-selects the partners; null and anything else pre-select nothing; absent keeps the old rule', () => {
    expect(channel({ defaultChoice: 'private_all' })).toBe('all');
    expect(channel({ defaultChoice: null })).toBeNull();
    expect(channel({ defaultChoice: 'public' })).toBeNull();
    expect(channel({ defaultChoice: 'PRIVATE_ALL' })).toBeNull();
    expect(channel({})).toBe('all');
    expect(channel({ partners: 0 })).toBeNull();
    expect(channel({ defaultChoice: 'private_all', partners: 0 })).toBeNull(); // nobody to send to
    expect(channel({ proposal: 'public', defaultChoice: null })).toBe('public'); // the load's own proposal wins
  });
  it('vehicle.warning is a Txt, rendered like the other Txt values; a bare string is not a Txt and is ignored', () => {
    const big = stepViewOf(fx.vehicleStep({ tooBig: true }));
    expect(big.kind === 'vehicle' && big.spec.warning).toMatchObject({ key: 'vehicle.tooBig' });
    const asString = { ...fx.vehicleStep({ tooBig: true }), widget: { ...(fx.vehicleStep({ tooBig: true }).widget as object), warning: 'old string' } } as unknown as IntakeStepEvent;
    const v = stepViewOf(asString);
    expect(v.kind === 'vehicle' && v.spec.warning).toBeUndefined();
  });
  it('a load with no weight: no fit anywhere (recommended or alternatives) and the widget still draws every truck', () => {
    const h = host(fx.vehicleStep({ unmeasurable: true }), { states: [true] }); // the alternatives sit behind "more" (collapsed by default)
    expect(h.ids.filter((i) => i.endsWith('-fit'))).toEqual([]);
    expect(h.ids).toEqual(expect.arrayContaining(['intake-vehicle-recommended', 'intake-vehicle-alt-t_rigid', 'intake-vehicle-alt-t_van']));
    expect(h.text).not.toMatch(/undefined|NaN/);
  });
});
