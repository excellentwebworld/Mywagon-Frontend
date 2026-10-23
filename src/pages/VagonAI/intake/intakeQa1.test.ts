/**
 * QA-1 (CS-1016 browser pass, section 2) — one describe per finding:
 *   HIGH   pick-orders dead end · MEDIUM vehicle-small contradiction · MEDIUM Greek number formats · MEDIUM tap targets ·
 *   MEDIUM focus after Discard & co · LOW "Suggested" tag · wording. Rendered through the real host view like the other widget tests.
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IntakeEvent, IntakeStepEvent, OptionsOk, OptionsResponse } from './contract';
import { cargoAnswer, cargoRowsOf, parsePositive, parseQty, parseWeight, plausibilityNote, rowIssues, typedKg } from './cargoModel';
import * as fx from './fixtures/intakeFixtures';
import * as ox from './fixtures/optionsFixtures';
import { FOCUS_INTENT_TTL_MS, armFocusIntent, resetFocusIntent, takeFocusIntent } from './intakeFocus';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import { parseAmount, parseOrderValue, parsePrice, stepViewOf } from './intakeModel';
import { allTestIds, byTestId, click, findAll, isDisabled, LOCALES, makeExists, makeUi, render, textOf, type Host, type Lang } from './intakeTestKit';
import { LiveFocus, numberLocaleOf, TapButton } from './intakeUi';
import { EL_NUMBERS, EN_NUMBERS, formatInput, formatMoney, parseNumber } from './numberFormat';
import { loadFirstOrders, ordersPhaseOf } from './optionsModel';
import { TAP_CLASS, TAP_LINK_CLASS, TAP_MIN_PX } from './tap';
import { SUGGESTED_TAG_STYLE } from './widgets/choiceKit';
import { publishState } from './widgets/SummaryCard';
import { resolveTheme } from '../../../utils/themes';
import { useIntakeFlow } from './useIntakeFlow';

type Fn = ReturnType<typeof vi.fn>;
const mkActions = (options?: (kind: string, q: unknown) => Promise<OptionsResponse>) => ({
  answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn(),
  ...(options ? { options: vi.fn((_e: IntakeStepEvent, kind: string, q?: unknown) => options(kind, q)) } : {}),
}) as unknown as IntakeActions & Record<keyof IntakeActions, Fn>;

function host(event: IntakeEvent, o: { lang?: Lang; busy?: boolean; live?: boolean; states?: unknown[]; options?: Parameters<typeof mkActions>[0] } = {}) {
  const a = mkActions(o.options);
  const lang = o.lang ?? 'en';
  const r = render(createElement(IntakeWidgetHostView, {
    ui: makeUi(lang), exists: makeExists(lang), state: { kind: 'event', event }, live: o.live ?? true, busy: o.busy ?? false, canMeasureRoute: true, actions: a,
  }), o.states);
  return { ...r, a, text: textOf(r.tree), ids: allTestIds(r.tree), el: (id: string) => byTestId(r.tree, id) };
}
/** A key of the intake locale subtree (`vagonai.shipment.intake.*`). */
const get = (lang: Lang, key: string): unknown =>
  `vagonai.shipment.intake.${key}`.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), LOCALES[lang]);

const EMPTY_ORDERS: OptionsOk = { ok: true, kind: 'orders', total: 0, nextCursor: null, defaultTab: null, groups: [] };
/** The pick-orders widget's hooks: [0] ticked [1] open groups [2] search [3] orders [4] more [5] wait [6] attempt
 *  [7] fetched groups [8] groups being fetched [9] server search result. */
const waiting = (orders: OptionsOk | null, wait: 'loading' | 'error' = 'loading'): unknown[] => [[], [], '', orders, false, wait, 0, {}, [], null];

/* ───────────────────────────── numbers ───────────────────────────── */

describe('numberFormat — one reader for every number the intake parses', () => {
  const rules = { maxIntDigits: 8, decimals: 2, allowZero: true };
  const ok = (raw: string, loc: Parameters<typeof parseNumber>[2], value: number) => expect(parseNumber(raw, rules, loc), `${raw}`).toEqual({ ok: true, value });
  const bad = (raw: string, loc: Parameters<typeof parseNumber>[2]) => expect(parseNumber(raw, rules, loc).ok, `${raw}`).toBe(false);

  it('1.234,50 and 1,234.50 are 1234.5 in BOTH languages (both marks present ⇒ unambiguous)', () => {
    for (const loc of [EN_NUMBERS, EL_NUMBERS]) { ok('1.234,50', loc, 1234.5); ok('1,234.50', loc, 1234.5); ok('1 234,5', loc, 1234.5); ok('99.999.999,99', loc, 99999999.99); ok('99,999,999.99', loc, 99999999.99); }
  });
  it('12,5 and 12.5 are 12.5 in both languages (one mark that cannot be a thousands mark ⇒ decimal)', () => {
    for (const loc of [EN_NUMBERS, EL_NUMBERS]) { ok('12,5', loc, 12.5); ok('12.5', loc, 12.5); ok('12,50', loc, 12.5); ok('0,5', loc, 0.5); ok('0.5', loc, 0.5); ok('1234,5', loc, 1234.5); ok('1234', loc, 1234); }
  });
  it('an ambiguous single group (1.234 / 1,234) is decided by the LANGUAGE — a thousands mark is never read as a decimal in the shipper\'s own convention', () => {
    ok('1.234', EL_NUMBERS, 1234); // Greek: the dot is the thousands mark
    ok('1,234', EN_NUMBERS, 1234); // English: the comma is the thousands mark
    ok('12.345', EL_NUMBERS, 12345);
    ok('999,999', EN_NUMBERS, 999999);
    // …and where the language reads the mark as a DECIMAL, three decimals break the 2-decimal rule: refused, not guessed
    bad('1.234', EN_NUMBERS);
    bad('1,234', EL_NUMBERS);
    // a leading zero is never a group
    bad('0.123', EN_NUMBERS); bad('0,123', EL_NUMBERS);
  });
  it('a repeated mark is a thousands mark only in proper groups of three', () => {
    ok('1.234.567', EL_NUMBERS, 1234567); ok('1.234.567', EN_NUMBERS, 1234567); ok('1,234,567', EN_NUMBERS, 1234567); ok('1,234,567', EL_NUMBERS, 1234567);
    for (const x of ['1.23.4', '12.34.567', '1,234,56', '1..234', '1.234.5']) { bad(x, EN_NUMBERS); bad(x, EL_NUMBERS); }
  });
  it('refuses a muddled mix, a sign, text, a bare mark, a trailing mark, a third decimal', () => {
    for (const x of ['1,2.3', '12.34,5', '1,234,50', '1.234,567', '-5', '+5', 'abc', '1e5', '.5', ',5', '5.', '5,', '12 abc', '1.2,3.4', '€']) {
      bad(x, EN_NUMBERS); bad(x, EL_NUMBERS);
    }
  });
  it('spaces, non-breaking spaces and € are ignored; blank is "empty", not "invalid"', () => {
    ok(' €1.234,50 ', EL_NUMBERS, 1234.5); ok('1\u00a0234,5', EL_NUMBERS, 1234.5); ok('1\u202f234.5', EN_NUMBERS, 1234.5);
    expect(parseNumber('  ', rules)).toEqual({ ok: false, reason: 'empty' });
    expect(parseNumber('', rules)).toEqual({ ok: false, reason: 'empty' });
  });
  it('the rules still bind: integer digits, decimals, and "above zero"', () => {
    expect(parseNumber('100.000.000,00', rules, EL_NUMBERS).ok).toBe(false); // 9 integer digits
    expect(parseNumber('0', { maxIntDigits: 7, decimals: 2 }).ok).toBe(false);
    expect(parseNumber('0,00', { maxIntDigits: 7, decimals: 2 }, EL_NUMBERS).ok).toBe(false);
    expect(parseNumber('0', rules)).toEqual({ ok: true, value: 0 });
    expect(parseNumber('007', rules)).toEqual({ ok: true, value: 7 });
  });
  it('formatMoney shows what the shipper reads; formatInput puts a number back into a box so it parses to itself', () => {
    expect(formatMoney(1280.5, EN_NUMBERS)).toBe('1,280.50');
    expect(formatMoney(1280.5, EL_NUMBERS)).toBe('1.280,50');
    expect(formatMoney(640, EN_NUMBERS)).toBe('640.00');
    expect(formatMoney(99999999.99, EL_NUMBERS)).toBe('99.999.999,99');
    expect(formatInput(1280.5, EN_NUMBERS)).toBe('1280.5');
    expect(formatInput(1280.5, EL_NUMBERS)).toBe('1280,5');
    expect(formatInput(640, EL_NUMBERS)).toBe('640');
    for (const n of [0.5, 12.5, 640, 1234.5, 1234.56, 9999999.99]) {
      for (const loc of [EN_NUMBERS, EL_NUMBERS]) {
        expect(parseNumber(formatInput(n, loc), rules, loc)).toEqual({ ok: true, value: n });
        expect(parseNumber(formatMoney(n, loc), rules, loc)).toEqual({ ok: true, value: n });
      }
    }
  });
  it('the language comes from the locale file (number.decimal): EN ".", EL ","', () => {
    expect(get('en', 'number.decimal')).toBe('.');
    expect(get('el', 'number.decimal')).toBe(',');
    expect(numberLocaleOf(makeUi('en'))).toEqual(EN_NUMBERS);
    expect(numberLocaleOf(makeUi('el'))).toEqual(EL_NUMBERS);
  });
});

describe('prices, order value, quantity and weight read both formats', () => {
  it('price: >0, ≤ 7 integer digits, ≤ 2 decimals — in both languages', () => {
    for (const loc of [EN_NUMBERS, EL_NUMBERS]) {
      expect(parsePrice('1.234,50', undefined, loc)).toEqual({ ok: true, value: 1234.5 });
      expect(parsePrice('1,234.50', undefined, loc)).toEqual({ ok: true, value: 1234.5 });
      expect(parsePrice('12,5', undefined, loc)).toEqual({ ok: true, value: 12.5 });
      expect(parsePrice('12.5', undefined, loc)).toEqual({ ok: true, value: 12.5 });
      expect(parsePrice('0', undefined, loc).ok).toBe(false);
      expect(parsePrice('10.000.000,00', undefined, loc).ok).toBe(false);
      expect(parsePrice('', undefined, loc)).toEqual({ ok: false, reason: 'empty' });
    }
    expect(parsePrice('1.234', undefined, EL_NUMBERS)).toEqual({ ok: true, value: 1234 });
    expect(parsePrice('1.234', undefined, EN_NUMBERS).ok).toBe(false);
    expect(parsePrice('1,234', undefined, EN_NUMBERS)).toEqual({ ok: true, value: 1234 });
    expect(parsePrice('1,234', undefined, EL_NUMBERS).ok).toBe(false);
    expect(parsePrice('640')).toEqual({ ok: true, value: 640 }); // no language given ⇒ English, as before
  });
  it('order value: 0 to 99,999,999.99, ≤ 2 decimals, blank = 0 (a skip) — in both languages', () => {
    for (const loc of [EN_NUMBERS, EL_NUMBERS]) {
      expect(parseOrderValue('1.234,50', loc)).toEqual({ ok: true, value: 1234.5 });
      expect(parseOrderValue('1,234.50', loc)).toEqual({ ok: true, value: 1234.5 });
      expect(parseOrderValue('12,5', loc)).toEqual({ ok: true, value: 12.5 });
      expect(parseOrderValue('', loc)).toEqual({ ok: true, value: 0 });
      expect(parseOrderValue('0', loc)).toEqual({ ok: true, value: 0 });
      expect(parseOrderValue('99.999.999,99', loc)).toEqual({ ok: true, value: 99999999.99 });
      expect(parseOrderValue('100.000.000', loc).ok).toBe(false);
      expect(parseOrderValue('-1', loc).ok).toBe(false);
    }
    expect(parseOrderValue('1.234', EL_NUMBERS)).toEqual({ ok: true, value: 1234 });
    expect(parseOrderValue('1.234', EN_NUMBERS).ok).toBe(false);
    expect(parseAmount('1.234,5', { maxIntDigits: 4, decimals: 1, allowZero: false }, EL_NUMBERS)).toEqual({ ok: true, value: 1234.5 });
  });
  it('quantity (≤ 7 digits, ≤ 3 decimals) and weight (≤ 9 digits, ≤ 3 decimals)', () => {
    expect(parseWeight('1.500', EL_NUMBERS)).toBe(1500); // Greek 1.500 = one thousand five hundred
    expect(parseWeight('1.500', EN_NUMBERS)).toBe(1.5);  // English 1.500 = one and a half (3 decimals allowed)
    expect(parseWeight('1,500', EN_NUMBERS)).toBe(1500);
    expect(parseWeight('1,5', EL_NUMBERS)).toBe(1.5);
    expect(parseWeight('1.234,567', EL_NUMBERS)).toBe(1234.567);
    expect(parseWeight('1,234.567', EN_NUMBERS)).toBe(1234.567);
    expect(parseWeight('0', EN_NUMBERS)).toBeNull();
    expect(parseQty('2,5', EL_NUMBERS)).toBe(2.5);
    expect(parseQty('2.5')).toBe(2.5);
    expect(parseQty('12.345.678', EL_NUMBERS)).toBeNull(); // 8 digits
    expect(parseQty('abc')).toBeNull();
    expect(parsePositive('1.234,5', 3, 9, EL_NUMBERS)).toBe(1234.5);
  });
  it('the cargo rows read, show and post with the shipper\'s own format', () => {
    const spec = (stepViewOf(ox.cargoStep()) as { kind: 'cargo'; spec: Parameters<typeof cargoRowsOf>[0] }).spec;
    const rows = cargoRowsOf(spec, EL_NUMBERS);
    // gateway numbers are written back into the boxes the Greek way, so they read as the same number
    for (const r of rows) {
      if (r.qty) expect(parseQty(r.qty, EL_NUMBERS)).toBe(Number(r.qty.replace(',', '.')));
      if (r.weight) expect(parseWeight(r.weight, EL_NUMBERS)).toBe(Number(r.weight.replace(',', '.')));
    }
    const typedRow = { ...rows[0]!, qty: '1.200', weight: '1.234,5', wUnit: 'Kgs' as const, unit: rows[0]!.unit ?? ('EUR_PALLETS' as never) };
    expect(typedKg(typedRow, EL_NUMBERS)).toBe(1234.5);
    expect(typedKg(typedRow, EN_NUMBERS)).toBe(1234.5); // both marks present ⇒ the same number in either language
    const ambiguous = { ...typedRow, weight: '1.500' };
    expect(typedKg(ambiguous, EL_NUMBERS)).toBe(1500); // Greek: the dot is a thousands mark
    expect(typedKg(ambiguous, EN_NUMBERS)).toBe(1.5);  // English: the dot is a decimal point
    expect(rowIssues(typedRow, EL_NUMBERS)).not.toContain('weight');
    expect(rowIssues({ ...typedRow, qty: '2,5x' }, EL_NUMBERS)).toContain('qty');
    expect(plausibilityNote(typedRow, EL_NUMBERS)).toBeDefined();
    expect(cargoAnswer('s1', [typedRow], EL_NUMBERS)).not.toBeNull();  });
});

/* ───────────────────────────── the widgets, Greek and English ───────────────────────────── */

describe('Price and order-value widgets, end to end', () => {
  const typedPrice = (lang: Lang, raw: string) => {
    const e = fx.priceStep();
    const h = host(e, { lang, states: [raw] });
    click(h.el('intake-price-set'));
    return { h, e };
  };
  it('Greek: 1.234,50 and 12,5 post; the error says which format is allowed, in Greek', () => {
    const { h, e } = typedPrice('el', '1.234,50');
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: 1234.5 });
    expect(typedPrice('el', '12,5').h.a.answer).toHaveBeenCalledWith(fx.priceStep(), { step: 'price', price: 12.5 });
    expect(typedPrice('el', '1.234').h.a.answer).toHaveBeenCalledWith(fx.priceStep(), { step: 'price', price: 1234 });
    const badOne = host(fx.priceStep(), { lang: 'el', states: ['1,2.3'] });
    expect(isDisabled(badOne.el('intake-price-set'))).toBe(true);
    expect(textOf([badOne.el('intake-price-invalid')!])).toBe('Δώσε ποσό μεγαλύτερο από 0 με έως 2 δεκαδικά, π.χ. 1.234,50 ή 12,5.');
  });
  it('English: 1,234.50 and 12.5 post; 1.234 is refused with the format in the message', () => {
    expect(typedPrice('en', '1,234.50').h.a.answer).toHaveBeenCalledWith(fx.priceStep(), { step: 'price', price: 1234.5 });
    expect(typedPrice('en', '12.5').h.a.answer).toHaveBeenCalledWith(fx.priceStep(), { step: 'price', price: 12.5 });
    const refused = host(fx.priceStep(), { lang: 'en', states: ['1.234'] });
    expect(isDisabled(refused.el('intake-price-set'))).toBe(true);
    expect(textOf([refused.el('intake-price-invalid')!])).toContain('for example 1,234.50 or 12.5');
  });
  it('the suggestion is shown and pre-filled in the language\'s format: €640.00 / €1.234,50, box 1234,5', () => {
    const base = fx.priceStep({ suggested: 1234.5 }) as IntakeStepEvent & { widget: { suggested: { label?: unknown } } };
    const e = { ...base, widget: { ...base.widget, suggested: { ...base.widget.suggested, label: undefined } } } as IntakeStepEvent; // no gateway label ⇒ the page words it itself
    const en = host(e, { lang: 'en' });
    const el = host(e, { lang: 'el' });
    expect(en.text).toContain('€1,234.50');
    expect(en.el('intake-price-input')!.props.value).toBe('1234.5');
    expect(el.text).toContain('€1.234,50');
    expect(el.el('intake-price-input')!.props.value).toBe('1234,5');
    // what is pre-filled posts back as the same number
    click(el.el('intake-price-set'));
    expect(el.a.answer).toHaveBeenCalledWith(e, { step: 'price', price: 1234.5 });
  });
  it('order value: the auto-sum in each format; Greek 1.234,50 posts; the error states the range and the format', () => {
    const e = fx.orderValueStep(1280.5);
    expect(host(e, { lang: 'en' }).text).toContain('€1,280.50');
    expect(host(e, { lang: 'el' }).text).toContain('€1.280,50');
    const post = host(fx.orderValueStep(null), { lang: 'el', states: ['1.234,50'] });
    click(post.el('intake-ordervalue-set'));
    expect(post.a.answer).toHaveBeenCalledWith(fx.orderValueStep(null), { step: 'order_value', orderValue: 1234.5 });
    const bad = host(fx.orderValueStep(null), { lang: 'el', states: ['abc'] });
    expect(textOf([bad.el('intake-ordervalue-invalid')!])).toBe('Δώσε ποσό από 0 έως 99.999.999,99 με έως 2 δεκαδικά, π.χ. 1.234,50 ή 12,5.');
    const bad2 = host(fx.orderValueStep(null), { lang: 'en', states: ['100000000'] });
    expect(textOf([bad2.el('intake-ordervalue-invalid')!])).toContain('from 0 to 99,999,999.99');
  });
});

/* ───────────────────────────── HIGH: pick-orders ───────────────────────────── */

describe('Pick orders — the waiting state is visible and useful (HIGH)', () => {
  const e = fx.pickOrdersStep();
  it('ROOT CAUSE pinned: the step without `orders` is still a pick_orders view (it used to degrade to the bare text step)', () => {
    expect(stepViewOf(e).kind).toBe('pick_orders');
    expect(stepViewOf({ ...e, widget: { kind: 'pick_orders', orders: { nope: 1 } } } as never).kind).toBe('pick_orders'); // a malformed page is "no page"
  });
  it('LOADING: a spinner line, a hint, and a way out (start manually); no Copy-only dead end', () => {
    const h = host(e, { states: waiting(null), options: async () => EMPTY_ORDERS });
    expect(h.ids).toContain('intake-orders-loading');
    expect(h.el('intake-orders-loading')!.props.role).toBe('status');
    expect(h.text).toContain('Loading your orders…');
    expect(h.text).toContain('start the load manually');
    expect(h.ids).toContain('intake-orders-manual');
    expect(h.ids).not.toContain('intake-orders-retry');
    expect(h.ids).not.toContain('intake-orders-continue');
    expect(h.text).toContain('Which orders go on this load?');
  });
  it('EMPTY: "No orders found.", Check again, and Start manually — which posts the gate answer {origin:manual}', () => {
    const h = host(e, { states: waiting(EMPTY_ORDERS), options: async () => EMPTY_ORDERS });
    expect(h.ids).toContain('intake-orders-empty');
    expect(h.text).toContain('No orders found.');
    expect(h.text).toContain('start the load manually');
    click(h.el('intake-orders-manual'));
    // Live QA 2026-10-19: a typed "Manually" never left this step (an origin already set ignored the model's), so it is a real answer.
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'gate', origin: 'manual' }, 'Manually');
    expect(h.a.sendText).not.toHaveBeenCalled();
    click(h.el('intake-orders-retry'));
    expect(h.setCalls).toEqual(expect.arrayContaining([{ index: 3, value: null }, { index: 5, value: 'loading' }, { index: 6, value: 1 }]));
  });
  it('ERROR: an alert with Try again and Start manually', () => {
    const h = host(e, { states: waiting(null, 'error'), options: async () => EMPTY_ORDERS });
    expect(h.ids).toContain('intake-orders-error');
    expect(h.el('intake-orders-error')!.props.role).toBe('alert');
    expect(h.text).toContain('I couldn\'t load your orders.');
    expect(textOf([h.el('intake-orders-retry')!])).toBe('Try again');
    click(h.el('intake-orders-retry'));
    expect(h.setCalls).toEqual(expect.arrayContaining([{ index: 5, value: 'loading' }]));
    click(h.el('intake-orders-manual'));
    expect(h.a.answer).toHaveBeenCalledTimes(1);
  });
  it('busy disables every control; without an options route there is no retry, only the way out', () => {
    const busy = host(e, { states: waiting(EMPTY_ORDERS), options: async () => EMPTY_ORDERS, busy: true });
    expect(isDisabled(busy.el('intake-orders-manual'))).toBe(true);
    expect(isDisabled(busy.el('intake-orders-retry'))).toBe(true);
    const none = host(e, { states: waiting(EMPTY_ORDERS) });
    expect(none.ids).not.toContain('intake-orders-retry');
    expect(none.ids).toContain('intake-orders-manual');
  });
  /* Live QA 2026-10-19: every customer showed its count, but opening one showed nothing (the gateway sends each customer EMPTY,
     §6.6 `collapsed`) and search only filtered customer names. */
  const LAZY: OptionsOk = {
    ok: true, kind: 'orders', total: 15, nextCursor: null, defaultTab: null,
    groups: [{ id: 'ord:cust:hellenic', label: 'Hellenic Retail Markets S.A.', count: 15, collapsed: true, options: [] }],
  };
  const ORDER = { id: '177', title: '80012460', subtitle: 'Athens \u2192 Ioannina' };
  const WITH_ORDER: OptionsOk = { ...LAZY, total: 1, groups: [{ ...LAZY.groups[0]!, count: 1, options: [ORDER] }] };
  const ready = (over: Record<number, unknown> = {}) => {
    const st = waiting(LAZY);
    for (const [i, v] of Object.entries(over)) st[Number(i)] = v;
    return st;
  };
  it('READY: opening a customer fetches ITS orders (group=<id>), marked as loading meanwhile', async () => {
    const calls: unknown[] = [];
    const h = host(e, { states: ready(), options: async (kind, q) => { calls.push([kind, q]); return WITH_ORDER; } });
    click(h.el('intake-orders-list-group-ord:cust:hellenic'));
    expect(calls).toEqual([['orders', { group: 'ord:cust:hellenic' }]]);
    expect(h.setCalls).toEqual(expect.arrayContaining([{ index: 1, value: ['g:ord:cust:hellenic'] }, { index: 8, value: ['g:ord:cust:hellenic'] }]));
    await new Promise((r) => setTimeout(r, 0));
    const fill = h.setCalls.find((c) => c.index === 7)!.value as (f: Record<string, unknown>) => Record<string, unknown>;
    expect(fill({})).toEqual({ 'ord:cust:hellenic': [ORDER] });
  });
  it('READY: a fetched customer, opened, lists its orders as tickable rows', () => {
    const h = host(e, { states: ready({ 1: ['g:ord:cust:hellenic'], 7: { 'ord:cust:hellenic': [ORDER] } }), options: async () => LAZY });
    expect(h.ids).toContain('intake-orders-list-opt-177');
    click(h.el('intake-orders-list-opt-177'));
    expect(h.setCalls).toEqual(expect.arrayContaining([{ index: 0, value: ['177'] }]));
  });
  it('READY: a search shows the SERVER matches (an order number inside a customer not opened yet)', () => {
    const h = host(e, { states: ready({ 2: '80012460', 9: { q: '80012460', res: WITH_ORDER } }), options: async () => LAZY });
    expect(h.ids).toContain('intake-orders-list-opt-177');
    expect(h.ids).not.toContain('intake-orders-searching');
    const pending = host(e, { states: ready({ 2: '80012460' }), options: async () => LAZY });
    expect(pending.ids).toContain('intake-orders-searching');
  });
  it('READY: "Start manually instead" sits next to Use N selected and posts the gate answer', () => {
    const h = host(e, { states: ready(), options: async () => LAZY });
    expect(h.ids).toContain('intake-orders-continue');
    click(h.el('intake-orders-manual'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'gate', origin: 'manual' }, 'Manually');
  });
  it('Greek, with no raw keys, in all three states', () => {
    for (const [states, id, word] of [[waiting(null), 'intake-orders-loading', 'Φορτώνω'], [waiting(EMPTY_ORDERS), 'intake-orders-empty', 'Δεν βρέθηκαν παραγγελίες.'], [waiting(null, 'error'), 'intake-orders-error', 'Δεν μπόρεσα']] as const) {
      const h = host(e, { lang: 'el', states: [...states], options: async () => EMPTY_ORDERS });
      expect(h.ids).toContain(id);
      expect(h.text).toContain(word);
      expect(h.text).not.toMatch(/vagonai\.shipment|\{\{/);
    }
    const h = host(e, { lang: 'el', states: waiting(EMPTY_ORDERS), options: async () => EMPTY_ORDERS });
    click(h.el('intake-orders-manual'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'gate', origin: 'manual' }, 'Χειροκίνητα');
  });
  it('the populated list shows none of the waiting states — only the way out (Start manually) stays', () => {
    const h = host(ox.pickOrdersListStep());
    expect(h.ids).toContain('intake-orders-list');
    expect(h.ids.filter((i) => /^intake-orders-(loading|empty|error|retry)$/.test(i))).toEqual([]);
    expect(h.ids).toContain('intake-orders-manual');
    // a first page that arrives later (the effect's result) turns the waiting card into the list
    const later = host(e, { states: waiting(ox.pickOrdersListStep().step === 'pick_orders' ? ((stepViewOf(ox.pickOrdersListStep()) as { spec: { orders: OptionsOk } }).spec.orders) : null) });
    expect(later.ids).toContain('intake-orders-list');
  });
  it('a first page with rows is "ready" even when it says total 0; no rows and no total is "empty"', () => {
    expect(ordersPhaseOf(null, 'loading')).toBe('loading');
    expect(ordersPhaseOf(null, 'error')).toBe('error');
    expect(ordersPhaseOf(EMPTY_ORDERS, 'loading')).toBe('empty');
    expect(ordersPhaseOf({ ...EMPTY_ORDERS, total: 3 }, 'loading')).toBe('ready');
    const listed = (stepViewOf(ox.pickOrdersListStep()) as { spec: { orders: OptionsOk } }).spec.orders;
    expect(ordersPhaseOf({ ...listed, total: 0 }, 'loading')).toBe('ready');
  });
  it('loadFirstOrders asks R4 `orders` (§6.6) and never throws', async () => {
    const calls: unknown[][] = [];
    const good = await loadFirstOrders(async (kind, q) => { calls.push([kind, q]); return EMPTY_ORDERS; });
    expect(good).toEqual({ ok: true, orders: EMPTY_ORDERS });
    expect(calls).toEqual([['orders', {}]]);
    expect(await loadFirstOrders(async () => ({ ok: false, code: 'unavailable' }))).toEqual({ ok: false });
    expect(await loadFirstOrders(async () => { throw new Error('offline'); })).toEqual({ ok: false });
  });
  it('previews: pick-orders / -empty show the empty answer, -loading never answers, -error fails; the list keeps its pages', async () => {
    const mod = await import('./devPreview');
    const idOf = (name: string) => ((mod.devPreview(`?intakePreview=${name}`)!.thread[0] as { intake: { event: IntakeStepEvent } }).intake.event.intakeId);
    expect(idOf('pick-orders')).toBe('int_9f1c');
    expect(idOf('pick-orders-empty')).toBe('int_9f1c');
    const first = await mod.previewApi.options!(idOf('pick-orders'), 'orders', {});
    expect(first.ok && first.total).toBe(0);
    const err = await mod.previewApi.options!(idOf('pick-orders-error'), 'orders', {});
    expect(err).toEqual({ ok: false, code: 'unavailable' });
    const pending = await Promise.race([mod.previewApi.options!(idOf('pick-orders-loading'), 'orders', {}), new Promise((r) => { setTimeout(() => r('pending'), 60); })]);
    expect(pending).toBe('pending');
    const page2 = await mod.previewApi.options!(idOf('pick-orders-list'), 'orders', { cursor: 'c1' });
    expect(page2.ok).toBe(true);
    // From my orders (gate) lands on the same empty state
    const next = (await mod.previewApi.answer('int_9f1c', { stepId: 's', rev: 1, answer: { step: 'gate', origin: 'orders' } } as never)) as { event: IntakeStepEvent };
    expect(stepViewOf(next.event).kind).toBe('pick_orders');
  });
});

/* ───────────────────────────── MEDIUM: vehicle-small ───────────────────────────── */

describe('Vehicle TOO_SMALL — never tagged Suggested, Publish stays on (§19.4)', () => {
  it('vehicle-small: no tag, a visible warning, every truck pickable', async () => {
    const mod = await import('./devPreview');
    const ev = (mod.devPreview('?intakePreview=vehicle-small')!.thread[0] as { intake: { event: IntakeStepEvent } }).intake.event;
    for (const lang of ['en', 'el'] as const) {
      const h = host(ev, { lang });
      expect(h.ids.filter((i) => i.includes('suggested'))).toEqual([]);
      expect(h.ids).not.toContain('intake-vehicle-recommended');
      expect(h.ids).toEqual(expect.arrayContaining(['intake-vehicle-alt-t_semi', 'intake-vehicle-alt-t_rigid', 'intake-vehicle-alt-t_van']));
      expect(findAll(h.tree, (n) => n.props.role === 'alert').length).toBeGreaterThanOrEqual(1);
    }
  });
  it('the page never gates on fit: picking the too-small truck posts the normal answer, and Publish\'s state is the gateway\'s alone (§19.4)', () => {
    const small = fx.vehicleStep({ fit: 'TOO_SMALL' });
    const h = host(small);
    click(h.el('intake-vehicle-alt-t_semi'));
    expect(h.a.answer).toHaveBeenCalledWith(small, { step: 'vehicle', typeIds: ['t_semi'], categoryIds: [] });
    const s = fx.summaryMissingPrice();
    const ready = { ...s, actions: { ...s.actions, publish: { ...s.actions.publish, enabled: true } }, routeNeeded: false };
    expect(publishState(ready, true).enabled).toBe(true);
  });
});

/* ───────────────────────────── MEDIUM: tap targets ───────────────────────────── */

describe('Tap targets ≥ 44 px (at 375 px), unchanged from md up', () => {
  it('the constants', () => {
    expect(TAP_MIN_PX).toBe(44);
    expect(TAP_CLASS).toContain('min-h-[44px]');
    expect(TAP_CLASS).toContain('md:min-h-0');
    expect(TAP_LINK_CLASS).toContain('min-h-[44px]');
    expect(TAP_LINK_CLASS).toContain('md:min-h-0');
  });
  it('TapButton wraps the shared Button: same props, 44 px minimum under md', () => {
    const t = makeUi('en').T;
    const r = render(createElement(TapButton, { T: t, variant: 'primary', 'data-testid': 'x', onClick: () => undefined, children: 'Go' } as never));
    const b = byTestId(r.tree, 'x')!;
    expect(b.type).toBe('button');
    expect(String(b.props.className)).toContain('min-h-[44px]');
    expect(String(b.props.className)).toContain('md:min-h-0');
    expect(textOf([b])).toBe('Go');
  });
  const buttonsOf = (h: ReturnType<typeof host>) => findAll(h.tree, (n) => n.type === 'button');
  const tall = (b: Host) => String(b.props.className ?? '').includes('min-h-[44px]') || Number((b.props.style as { minHeight?: number } | undefined)?.minHeight ?? 0) >= TAP_MIN_PX;
  it('every button of every intake preview is tall enough (class or inline min-height)', async () => {
    const mod = await import('./devPreview');
    const names = ['gate', 'describe', 'upload', 'text', 'express', 'editing', 'discard', 'summary', 'summary-missing', 'summary-route', 'summary-blocked', 'done', 'done-published',
      'pick-orders', 'pick-orders-loading', 'pick-orders-empty', 'pick-orders-error', 'pick-orders-list', 'vehicle', 'vehicle-none', 'vehicle-small', 'channel', 'channel-suggested', 'channel-nopartners', 'tracking', 'tracking-off',
      'negotiable', 'price', 'price-fixed', 'order-value', 'location-pickup', 'location-dropoff', 'location-noexact', 'cargo-tree', 'cargo-ask', 'cargo-pending-unit', 'cargo-ambiguous', 'cargo-none',
      'cargo-plaus-low', 'cargo-two-lines', 'window', 'window-dropoff', 'more-pickups', 'partners-pick', 'vehicle-tight', 'vehicle-toobig'];
    let seen = 0;
    for (const n of names) {
      const p = mod.devPreview(`?intakePreview=${n}`);
      expect(p, n).not.toBeNull();
      const first = (p!.thread[0] as { intake?: { kind: string; event?: IntakeEvent } }).intake;
      if (!first || first.kind !== 'event' || !first.event) continue;
      const h = host(first.event, { options: async () => EMPTY_ORDERS, states: n === 'pick-orders' ? waiting(EMPTY_ORDERS) : undefined });
      for (const b of buttonsOf(h)) { seen += 1; expect(tall(b), `${n}: ${String(b.props['data-testid'])}`).toBe(true); }
    }
    expect(seen).toBeGreaterThan(60);
  });
  it('the summary\'s text links (Edit, jump, Discard) carry the link class', () => {
    const h = host(fx.summaryMissingPrice());
    // A text link is drawn by the `vai-ik-link` class (intake.css) — it used to be an inline `textDecoration: underline`.
    const links = findAll(h.tree, (n) => n.type === 'button' && /\bvai-ik-link\b/.test(String(n.props.className ?? '')));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(String(l.props.className), String(l.props['data-testid'])).toContain('min-h-[44px]');
    expect(String(h.el('intake-discard')!.props.className)).toContain('min-h-[44px]');
  });
});

/* ───────────────────────────── MEDIUM: focus ───────────────────────────── */

describe('Focus follows the shipper\'s action (MEDIUM)', () => {
  it('intakeFocus: armed by an action, taken once, expires, never on page load', () => {
    resetFocusIntent();
    expect(takeFocusIntent(1000)).toBe(false); // nobody acted
    armFocusIntent(1000);
    expect(takeFocusIntent(1000 + FOCUS_INTENT_TTL_MS)).toBe(true);
    expect(takeFocusIntent(1000 + FOCUS_INTENT_TTL_MS)).toBe(false); // once
    armFocusIntent(1000);
    expect(takeFocusIntent(1000 + FOCUS_INTENT_TTL_MS + 1)).toBe(false); // the request failed and nothing arrived: stale
    resetFocusIntent();
  });
  it('every live card is a focusable (tabIndex −1) labelled group; spent and history rows are not', () => {
    const cases: [IntakeEvent, string][] = [
      [fx.pickOrdersStep(), 'Which orders go on this load?'],
      [fx.priceStep(), 'What price do you offer?'],
      [fx.summaryMissingPrice(), ''],
      [fx.doneDraft(), ''],
      [fx.discarded(), ''],
    ];
    for (const [ev, label] of cases) {
      const h = host(ev, { states: ev.type === 'step' && ev.step === 'pick_orders' ? waiting(EMPTY_ORDERS) : undefined });
      const live = h.el('intake-live');
      expect(live, ev.type).toBeDefined();
      expect(live!.props.tabIndex).toBe(-1);
      expect(live!.props.role).toBe('group');
      expect(typeof live!.props['aria-label']).toBe('string');
      expect(String(live!.props['aria-label']).length).toBeGreaterThan(0);
      if (label) expect(live!.props['aria-label']).toBe(label);
    }
    expect(host(fx.priceStep(), { live: false }).ids).not.toContain('intake-live');
  });
  it('LiveFocus renders its children inside the region', () => {
    const r = render(createElement(LiveFocus, { label: 'L', children: createElement('span', { 'data-testid': 'kid' }, 'k') }));
    expect(byTestId(r.tree, 'intake-live')!.children.length).toBe(1);
    expect(byTestId(r.tree, 'kid')).toBeDefined();
  });
  it('"Discard this load?": the group is named, and the safe answer is what receives focus (the confirm is a real element id)', () => {
    const h = host(fx.summaryMissingPrice(), { states: [true] });
    const group = h.el('intake-discard-confirm')!;
    expect(group.props['aria-label']).toBe('Discard this load?');
    expect(group.props.role).toBe('group');
    expect(h.ids).toEqual(expect.arrayContaining(['intake-discard-yes', 'intake-discard-no']));
    expect(h.ids).not.toContain('intake-discard');
    // "No, keep going" asks to restore focus to the link (the DiscardLink effect reads this); it just closes the question
    click(h.el('intake-discard-no'));
    expect(h.setCalls).toEqual([{ index: 0, value: false }]);
    click(h.el('intake-discard-yes'));
    expect(h.a.discard).toHaveBeenCalledTimes(1);
  });
  it('every action that brings a new card arms the focus intent: answer, finish (Save as draft), undo, discard, new load', async () => {
    const mkApi = () => {
      const okAnswer = { ok: true, rev: 9, event: fx.summaryMissingPrice() };
      return {
        start: vi.fn(async () => ({ ok: true, intakeId: 'int_9f1c', rev: 0, event: fx.gateStep('en', 0), history: [] })),
        get: vi.fn(), answer: vi.fn(async () => okAnswer), discard: vi.fn(async () => okAnswer), undo: vi.fn(async () => okAnswer),
        finish: vi.fn(async () => ({ ok: true, rev: 9, event: fx.doneDraft() })),
      };
    };
    const captured: { flow?: ReturnType<typeof useIntakeFlow> } = {};
    const Probe = ({ api }: { api: ReturnType<typeof mkApi> }) => {
      captured.flow = useIntakeFlow({
        thread: [], setThread: () => undefined, conversationId: 'c1', lang: 'en', pageBusy: false, send: () => undefined, onOpenUrl: () => undefined,
        unavailableText: 'x', routeFailedText: 'y', api: api as never,
      });
      return null;
    };
    const flush = async () => { for (let i = 0; i < 6; i += 1) await new Promise<void>((r) => { setTimeout(r, 0); }); };
    const summary = fx.summaryMissingPrice();
    const step = fx.priceStep();
    const drive: [string, (f: NonNullable<typeof captured.flow>) => void][] = [
      ['answer', (f) => f.actions.answer(step, { step: 'price', price: 5 })],
      ['discard', (f) => f.actions.discard(summary)],
      ['finish', (f) => f.actions.finish(summary, 'save_draft')],
      ['undo', (f) => f.actions.undo(fx.doneDraft())],
      ['new load', (f) => { void f.startLoad(); }],
    ];
    for (const [name, go] of drive) {
      resetFocusIntent();
      render(createElement(Probe, { api: mkApi() }));
      go(captured.flow!);
      await flush();
      expect(takeFocusIntent(), name).toBe(true);
    }
    resetFocusIntent();
  });
});

/* ───────────────────────────── LOW: the Suggested tag ───────────────────────────── */

describe('The "Suggested" tag is readable (LOW)', () => {
  const lum = (hex: string): number => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
  const over = (rgba: string, base: string): string => {
    const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(rgba.replace(/\s/g, ''));
    if (!m) return rgba;
    const b = [1, 3, 5].map((i) => parseInt(base.slice(i, i + 2), 16));
    const mix = [1, 2, 3].map((i, k) => Math.round(Number(m[i]) * Number(m[4]) + b[k]! * (1 - Number(m[4]))));
    return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  it('12 px, bold, the primary text colour, in an accent pill — and ≥ 4.5:1 on both card backgrounds, light and dark (WCAG AA)', () => {
    for (const dark of [false, true]) {
      const T = resolveTheme('amethyst', dark);
      const s = SUGGESTED_TAG_STYLE(T);
      expect(s.fontSize).toBeGreaterThanOrEqual(12);
      expect(Number(s.fontWeight)).toBeGreaterThanOrEqual(700);
      expect(s.color).toBe(T.t1);
      expect(String(s.border)).toContain(T.ac);
      for (const bg of [T.sf, over(T.al, T.sf)]) expect(ratio(String(s.color), bg), `${dark ? 'dark' : 'light'} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      // the accent outline is a graphic cue: ≥ 3:1 against the card (WCAG 1.4.11)
      expect(ratio(T.ac, T.sf)).toBeGreaterThanOrEqual(3);
    }
  });
  it('the tag still appears where it did (a usable recommendation, a pre-selected default) and uses that style', () => {
    const h = host(fx.vehicleStep());
    const tag = h.el('intake-vehicle-recommended-suggested')!;
    expect(tag.props.style).toEqual(SUGGESTED_TAG_STYLE(makeUi('en').T));
    expect(textOf([tag])).toBe('Suggested');
  });
});

/* ───────────────────────────── wording ───────────────────────────── */

describe('Wording (EN/EL parity)', () => {
  it('"Or choose only:" / «Ή επίλεξε μόνο:» (was "Or only:")', () => {
    expect(get('en', 'vehicle.narrow')).toBe('Or choose only:');
    expect(get('el', 'vehicle.narrow')).toBe('Ή επίλεξε μόνο:');
    const h = host(fx.vehicleStep({ recommended: false }));
    expect(h.text).toContain('Or choose only:');
  });
  it('the public-load warning is an amber warning box (with the AlertTriangle icon)', () => {
    const s = host(fx.channelStep({}), { states: [true] });
    // The amber box is the `vai-ik-panel--warn` class (intake.css: amber border + tint); the icon keeps its amber colour inline.
    expect(String(s.el('intake-channel-publicbox')!.props.className)).toContain('vai-ik-panel--warn');
    expect(JSON.stringify(s.el('intake-channel-publicbox')!.children)).toContain('#B45309');
    expect(textOf([s.el('intake-channel-warning')!])).toContain('public load');
  });
  it('every key the QA-1 widgets ask for exists in EN and EL, with the same placeholders', () => {
    const keys = ['number.decimal', 'price.invalidFormat', 'orderValue.invalidFormat', 'cargo.qtyInvalidFormat', 'cargo.weightInvalidFormat', 'vehicle.noFitSuggestion', 'vehicle.narrow',
      'pickOrders.loading', 'pickOrders.loadingHint', 'pickOrders.empty', 'pickOrders.emptyHint', 'pickOrders.error', 'pickOrders.errorHint', 'pickOrders.retry', 'pickOrders.checkAgain', 'pickOrders.manual'];
    const holes = (v: unknown) => (String(v).match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((x) => x.replace(/\s/g, '')).sort().join(',');
    for (const k of keys) {
      expect(get('en', k), `en ${k}`).toBeTypeOf('string');
      expect(get('el', k), `el ${k}`).toBeTypeOf('string');
      expect(holes(get('el', k)), `placeholders ${k}`).toBe(holes(get('en', k)));
    }
  });
});
