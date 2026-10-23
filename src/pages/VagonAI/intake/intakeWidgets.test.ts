import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IntakeEvent } from './contract';
import * as fx from './fixtures/intakeFixtures';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import type { IntakeMessageState } from './intakeThread';
import { allTestIds, byTestId, click, findAll, isDisabled, makeExists, makeUi, render, textOf, type Lang } from './intakeTestKit';
import { publishState } from './widgets/SummaryCard';

const actions = (): IntakeActions & { [K in keyof IntakeActions]: ReturnType<typeof vi.fn> } => ({
  answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn(),
}) as never;

function host(
  state: IntakeMessageState | IntakeEvent,
  o: { lang?: Lang; live?: boolean; busy?: boolean; canMeasureRoute?: boolean; routeInfo?: { km: number; estimated: boolean } | null; states?: unknown[] } = {},
) {
  const a = actions();
  const lang = o.lang ?? 'en';
  const st: IntakeMessageState = 'kind' in state ? state : { kind: 'event', event: state };
  const r = render(createElement(IntakeWidgetHostView, {
    ui: makeUi(lang), exists: makeExists(lang), state: st, live: o.live ?? true, busy: o.busy ?? false, canMeasureRoute: o.canMeasureRoute ?? true, routeInfo: o.routeInfo, actions: a,
  }), o.states);
  return { ...r, a, text: textOf(r.tree), ids: allTestIds(r.tree), el: (id: string) => byTestId(r.tree, id) };
}

const noRawKeys = (text: string) => {
  expect(text).not.toMatch(/vagonai\.shipment/);
  expect(text).not.toMatch(/\{\{|\}\}/);
  expect(text).not.toMatch(/\b(gate|summary|describe|undo|cancel|done)\.[a-zA-Z]+\b(?!\s*\w)/);
};

describe('Gate widget — From order(s) / Manually', () => {
  it('shows both options as one tap each, no Continue button', () => {
    const h = host(fx.gateStep());
    expect(h.ids).toEqual(expect.arrayContaining(['intake-choice-orders', 'intake-choice-manual']));
    expect(findAll(h.tree, (n) => n.type === 'button')).toHaveLength(2);
    expect(h.text).toContain('How do you want to start?');
    expect(h.text).toContain('From my orders');
    expect(h.text).toContain('Manually');
  });
  it('a tap IS the answer: it posts the origin with the step on screen', () => {
    const e = fx.gateStep('en', 0);
    const h = host(e);
    click(h.el('intake-choice-orders'));
    click(h.el('intake-choice-manual'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'gate', origin: 'orders' });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'gate', origin: 'manual' });
  });
  it('is Greek when the gateway sent Greek', () => {
    const h = host(fx.gateStep('el'), { lang: 'el' });
    expect(h.text).toContain('Από τις παραγγελίες μου');
    expect(h.text).toContain('Χειροκίνητα');
  });
  it('every control is disabled while a request is in flight (double-tap safe)', () => {
    const h = host(fx.gateStep(), { busy: true });
    expect(isDisabled(h.el('intake-choice-orders'))).toBe(true);
    expect(isDisabled(h.el('intake-choice-manual'))).toBe(true);
  });
  it('the upload offer is the same widget with its own answers', () => {
    const e = fx.uploadOfferStep();
    const h = host(e);
    click(h.el('intake-choice-upload'));
    click(h.el('intake-choice-continue'));
    // "upload" hands off to the page's import flow (which posts the answer itself); "continue" is a plain answer (pkg 2)
    expect(h.a.upload).toHaveBeenCalledWith(e);
    expect(h.a.answer).toHaveBeenCalledTimes(1);
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'upload_offer', choice: 'continue' });
  });
  it('quiet shortcuts appear only when the step allows them', () => {
    expect(host(fx.gateStep()).ids).not.toContain('intake-shortcuts');
    const e = { ...fx.gateStep(), canExpress: true, canToSummary: true, editing: true };
    const h = host(e);
    click(h.el('intake-express')); click(h.el('intake-to-summary')); click(h.el('intake-cancel-edit'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'express', mode: 'defaults' });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'to_summary' });
    expect(h.a.answer).toHaveBeenNthCalledWith(3, e, { step: 'edit_cancel' });
  });
});

describe('Describe widget — in your own words, or step by step', () => {
  it('one text box, one Send, and a quiet "step by step" way out', () => {
    const h = host(fx.describeStep());
    expect(h.ids).toEqual(expect.arrayContaining(['intake-describe-input', 'intake-describe-send', 'intake-describe-stepbystep', 'intake-describe-example']));
    expect(h.text).toContain("I'd rather go step by step");
    expect(h.text).toContain('Send');
    noRawKeys(h.text);
  });
  it('Send is off until there is something to send', () => {
    expect(isDisabled(host(fx.describeStep()).el('intake-describe-send'))).toBe(true);
    expect(isDisabled(host(fx.describeStep(), { states: ['   \n '] }).el('intake-describe-send'))).toBe(true);
    expect(isDisabled(host(fx.describeStep(), { states: ['10 pallets'] }).el('intake-describe-send'))).toBe(false);
  });
  it('Send hands the tidied text to the chat (a normal turn) and clears the box', () => {
    const h = host(fx.describeStep(), { states: ['  10 pallets,   Athens to Ioannina \n'] });
    click(h.el('intake-describe-send'));
    expect(h.a.sendText).toHaveBeenCalledWith('10 pallets, Athens to Ioannina');
    expect(h.setCalls).toContainEqual({ index: 0, value: '' });
    expect(h.a.answer).not.toHaveBeenCalled();
  });
  it('Enter sends, Shift+Enter does not', () => {
    const h = host(fx.describeStep(), { states: ['hello'] });
    const input = h.el('intake-describe-input')!;
    const key = (init: object) => (input.props.onKeyDown as (e: unknown) => void)({ key: 'Enter', shiftKey: false, nativeEvent: { isComposing: false }, preventDefault: () => undefined, ...init });
    key({ shiftKey: true });
    expect(h.a.sendText).not.toHaveBeenCalled();
    key({});
    expect(h.a.sendText).toHaveBeenCalledWith('hello');
    key({ nativeEvent: { isComposing: true } }); // an IME confirming a character is not "send"
    expect(h.a.sendText).toHaveBeenCalledTimes(1);
  });
  it('"step by step" is an answer (R3), not a chat turn', () => {
    const e = fx.describeStep();
    const h = host(e);
    click(h.el('intake-describe-stepbystep'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'describe', choice: 'step_by_step' });
    expect(h.a.sendText).not.toHaveBeenCalled();
  });
  it('the example fills the box without the "e.g." lead-in', () => {
    const h = host(fx.describeStep());
    click(h.el('intake-describe-example'));
    expect(h.setCalls.at(-1)?.value).toBe('10 pallets of toilet paper, Athens to Ioannina, pickup tomorrow 3–5 pm');
  });
  it('busy disables everything', () => {
    const h = host(fx.describeStep(), { busy: true, states: ['x'] });
    for (const id of ['intake-describe-input', 'intake-describe-send', 'intake-describe-stepbystep', 'intake-describe-example']) expect(isDisabled(h.el(id))).toBe(true);
    click(h.el('intake-describe-send'));
    expect(h.a.sendText).not.toHaveBeenCalled();
  });
  it('EL chrome (placeholder, Send) comes from el.json', () => {
    const h = host(fx.describeStep(), { lang: 'el' });
    expect(textOf([h.el('intake-describe-send')!])).toBe('Αποστολή');
    expect(h.el('intake-describe-input')!.props.placeholder).toMatch(/[Α-Ωα-ω]/);
  });
});

describe('Summary card', () => {
  it('one row per fact, each with its own Edit', () => {
    const e = fx.summaryMissingPrice();
    const h = host(e);
    for (const r of e.rows) {
      expect(h.ids).toContain(`intake-row-${r.id}`);
      expect(h.ids).toContain(`intake-edit-${r.id}`);
    }
    expect(h.text).toContain('Check your load');
    expect(h.text).toContain('Athens Distribution Centre');
  });
  it('Edit opens the step that owns the row (R3 edit), with the stop when there is one', () => {
    const e = fx.summaryMissingPrice();
    const h = host(e);
    click(h.el('intake-edit-stop-0'));
    click(h.el('intake-edit-truck'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'edit', target: 'location', stopKey: 's1' });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'edit', target: 'vehicle' });
  });
  it('an empty row says it is needed; a defaulted row says so', () => {
    const h = host(fx.summaryMissingPrice());
    expect(textOf([h.el('intake-row-price')!])).toContain('Not set — needed to publish');
    expect(textOf([h.el('intake-row-truck')!])).toContain('default');
  });
  it('Save as draft is the main action; Publish is off with a reason when a price is missing', () => {
    const h = host(fx.summaryMissingPrice());
    expect(isDisabled(h.el('intake-save-draft'))).toBe(false);
    expect(isDisabled(h.el('intake-publish'))).toBe(true);
    click(h.el('intake-publish'));
    expect(h.a.finish).not.toHaveBeenCalled();
    click(h.el('intake-save-draft'));
    expect(h.a.finish).toHaveBeenCalledWith(fx.summaryMissingPrice(), 'save_draft');
  });
  it('"what\'s missing" are jump links to the step that owns each one', () => {
    const e = fx.summaryMissingPrice();
    const h = host(e);
    expect(textOf([h.el('intake-missing')!])).toBe('To publish, add: Price');
    click(h.el('intake-jump-price'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'edit', target: 'price' });
  });
  it('several missing items are several links; the summary itself is never a link', () => {
    const e = fx.summaryDraftBlocked();
    const h = host(e);
    expect(h.ids).toEqual(expect.arrayContaining(['intake-jump-location', 'intake-jump-cargo']));
    expect(h.ids).not.toContain('intake-jump-summary');
    click(h.el('intake-jump-cargo'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'edit', target: 'cargo', stopKey: 's1' });
  });
  it('when even a draft is impossible, Save is off and the gate says why', () => {
    const h = host(fx.summaryDraftBlocked());
    expect(isDisabled(h.el('intake-save-draft'))).toBe(true);
    expect(h.text).toContain('Add where the load is picked up.');
  });
  it('a complete load can be published, and the click says so', () => {
    const e = fx.summaryComplete();
    const h = host(e);
    expect(h.ids).not.toContain('intake-missing');
    expect(isDisabled(h.el('intake-publish'))).toBe(false);
    click(h.el('intake-publish'));
    expect(h.a.finish).toHaveBeenCalledWith(e, 'publish');
    expect(h.text).toContain('That is only 0.25 kg per pallet');
  });
  it('"I want to publish" is acknowledged but never skips the check — Save stays the primary action', () => {
    const h = host(fx.summaryComplete({ wantedFinish: 'publish' }));
    expect(h.ids).toContain('intake-wanted-publish');
    expect(isDisabled(h.el('intake-save-draft'))).toBe(false);
    expect(host(fx.summaryComplete()).ids).not.toContain('intake-wanted-publish');
  });
  it('Publish waits for a route when the page cannot measure one, and says why instead of failing on click', () => {
    const e = fx.summaryComplete({ routeNeeded: true });
    expect(publishState(e, false)).toEqual({ enabled: false, reason: 'route' });
    expect(publishState(e, true)).toEqual({ enabled: true, reason: null });
    const h = host(e, { canMeasureRoute: false });
    expect(isDisabled(h.el('intake-publish'))).toBe(true);
    // routeNeeded with no `route` is "a site has no map position" (§19.9): Publish off, the reason visible, Save as draft on.
    expect(textOf([h.el('intake-publish-reason')!])).toMatch(/no map position/);
    expect(isDisabled(host(e, { canMeasureRoute: true }).el('intake-publish'))).toBe(false);
    const withRoute = fx.summaryComplete({ routeNeeded: true, withRoute: true });
    expect(textOf([host(withRoute, { canMeasureRoute: false }).el('intake-publish-reason')!])).toMatch(/route distance/);
  });
  it('says "≈ N km (estimate)" when the distance is a straight-line estimate — and still lets Publish go (§19.8)', () => {
    const e = fx.summaryComplete({ routeNeeded: true, withRoute: true });
    const est = host(e, { routeInfo: { km: 412.6, estimated: true } });
    expect(textOf([est.el('intake-route-estimate')!])).toBe('≈ 413 km (estimate)');
    expect(isDisabled(est.el('intake-publish'))).toBe(false);
    expect(host(e, { routeInfo: { km: 412.6, estimated: false } }).ids).not.toContain('intake-route-estimate');
    expect(host(e).ids).not.toContain('intake-route-estimate');
    expect(textOf([host(e, { routeInfo: { km: 80, estimated: true }, lang: 'el' }).el('intake-route-estimate')!])).toBe('≈ 80 χλμ (εκτίμηση)');
  });
  it('with positions to measure, Publish is on and the click asks for the route', () => {
    const e = fx.summaryComplete({ routeNeeded: true, withRoute: true });
    const h = host(e, { canMeasureRoute: true });
    expect(isDisabled(h.el('intake-publish'))).toBe(false);
    expect(h.ids).not.toContain('intake-publish-reason');
    click(h.el('intake-publish'));
    expect(h.a.finish).toHaveBeenCalledWith(e, 'publish');
  });
  it('whatever the route, Save as draft stays on', () => {
    const h = host(fx.summaryComplete({ routeNeeded: true }), { canMeasureRoute: false });
    expect(isDisabled(h.el('intake-save-draft'))).toBe(false);
    expect(isDisabled(h.el('intake-publish'))).toBe(true);
  });
  it('the server\'s own reason is used when it disables Publish', () => {
    expect(publishState(fx.summaryMissingPrice(), true)).toMatchObject({ enabled: false, reason: 'server', serverReason: 'To publish, add: Price' });
  });
  it('busy disables Edit, links, Save and Publish', () => {
    const h = host(fx.summaryComplete(), { busy: true });
    for (const id of ['intake-edit-stop-0', 'intake-save-draft', 'intake-publish']) expect(isDisabled(h.el(id))).toBe(true);
    expect(isDisabled(host(fx.summaryMissingPrice(), { busy: true }).el('intake-jump-price'))).toBe(true);
  });
  it('discarding asks first: the first click only asks, Yes discards, No keeps', () => {
    const e = fx.summaryComplete();
    const ask = host(e);
    click(ask.el('intake-discard'));
    expect(ask.setCalls).toContainEqual({ index: 0, value: true });
    expect(ask.a.discard).not.toHaveBeenCalled();
    const asking = host(e, { states: [true] });
    expect(asking.ids).toContain('intake-discard-confirm');
    click(asking.el('intake-discard-yes'));
    expect(asking.a.discard).toHaveBeenCalledWith(e);
    click(asking.el('intake-discard-no'));
    expect(asking.a.discard).toHaveBeenCalledTimes(1);
  });
  it('a notice from a refused finish shows under the card', () => {
    const e = fx.summaryComplete();
    const h = host({ kind: 'event', event: e, notice: { tone: 'error', text: 'MYVAGON refused the price.' } });
    expect(h.text).toContain('MYVAGON refused the price.');
  });
  it('EL summary: Greek chrome, Greek source tags, no English leaks from the locale', () => {
    const h = host(fx.summaryMissingPrice(), { lang: 'el' });
    expect(textOf([h.el('intake-save-draft')!])).toBe('Αποθήκευση ως πρόχειρο');
    expect(textOf([h.el('intake-missing')!])).toMatch(/^Για να δημοσιεύσεις, πρόσθεσε/);
    expect(textOf([h.el('intake-edit-truck')!])).toBe('Επεξεργασία');
    noRawKeys(h.text);
  });
});

describe('Done card — result and Undo', () => {
  it('a saved draft offers Open, Create another and Undo result', () => {
    const e = fx.doneDraft();
    const h = host(e);
    expect(h.text).toContain('Saved as draft SID-4821');
    click(h.el('intake-open')); click(h.el('intake-new-load')); click(h.el('intake-undo'));
    expect(h.a.open).toHaveBeenCalledWith('/shipments/4821');
    expect(h.a.newLoad).toHaveBeenCalledTimes(1);
    expect(h.a.undo).toHaveBeenCalledWith(e);
  });
  it('a published load has NO undo button — it says why instead', () => {
    const h = host(fx.donePublished());
    expect(h.ids).not.toContain('intake-undo');
    expect(textOf([h.el('intake-undo-unavailable')!])).toMatch(/can't be undone/);
  });
  it('an unknown outcome never offers to open a shipment that may not exist', () => {
    const h = host(fx.doneUnknown());
    expect(h.ids).not.toContain('intake-open');
    expect(h.ids).not.toContain('intake-undo');
    expect(h.text).toContain('check before trying again');
  });
  it('a failed undo stays on the card as an error with Try again — never looks like success', () => {
    const h = host({ kind: 'event', event: fx.doneDraft(), notice: { tone: 'error', text: "I couldn't remove the draft.", retry: 'undo' } });
    expect(h.text).toContain("I couldn't remove the draft.");
    expect(h.ids).toContain('intake-undo');
    click(h.el('intake-retry'));
    expect(h.a.retry).toHaveBeenCalledWith('undo');
  });
  it('a non-retryable failure has no Try again', () => {
    const h = host({ kind: 'event', event: fx.doneDraft(), notice: { tone: 'error', text: 'Gone.' } });
    expect(h.ids).not.toContain('intake-retry');
  });
  it('an earlier done card is read-only', () => {
    const h = host(fx.doneDraft(), { live: false });
    expect(findAll(h.tree, (n) => n.type === 'button')).toHaveLength(0);
  });
  it('unsupported items from the order are listed', () => {
    const h = host({ ...fx.doneDraft(), unsupported: ['Two-way pallet exchange'] });
    expect(textOf([h.el('intake-unsupported')!])).toContain('Two-way pallet exchange');
  });
});

describe('earlier cards are read-only history', () => {
  it('a spent step shows the question and the answer, with nothing to press', () => {
    const h = host({ kind: 'event', event: fx.gateStep(), answered: { key: 'gate.manual', fallbackText: 'Manually' } }, { live: false });
    expect(h.text).toContain('How do you want to start?');
    expect(textOf([h.el('intake-spent-answer')!])).toBe('Manually');
    expect(findAll(h.tree, (n) => n.type === 'button' || n.type === 'textarea')).toHaveLength(0);
  });
  it('the kept answer follows a language switch', () => {
    const state: IntakeMessageState = { kind: 'event', event: fx.gateStep(), answered: { key: 'gate.manual', fallbackText: 'Manually' } };
    expect(textOf([host(state, { live: false, lang: 'el' }).el('intake-spent-answer')!])).toBe('Χειροκίνητα');
  });
  it('a spent summary keeps its rows on screen, read-only (editing one field from it)', () => {
    const e = fx.summaryComplete();
    const h = host(e, { live: false });
    expect(h.ids).toEqual(['intake-spent-summary', ...e.rows.map((r) => `intake-spent-row-${r.id}`)]);
    expect(h.text).toContain('Check your load');
    for (const r of e.rows) expect(textOf([h.el(`intake-spent-row-${r.id}`)!])).toContain(r.value);
    expect(findAll(h.tree, (n) => n.type === 'button')).toHaveLength(0);
  });
  it('a spent summary draws an unset row as a gap, like the live card', () => {
    const h = host(fx.summaryMissingPrice(), { live: false });
    const price = findAll([h.el('intake-spent-row-price')!], (n) => n.type === 'dd')[0]!;
    expect(price.props['data-empty']).toBe('true');
    expect(textOf([price])).toBe('Not set — needed to publish');
  });
  it('a restored history row shows the answer from the locale, EN and EL', () => {
    const item = fx.history()[1]!;
    expect(host({ kind: 'history', intakeId: 'int_9f1c', item }).text).toContain('Site: Athens Distribution Centre');
    expect(host({ kind: 'history', intakeId: 'int_9f1c', item }, { lang: 'el' }).text).toMatch(/Τοποθεσία: Athens Distribution Centre/);
  });
  it('an unknown history key shows the stored snapshot', () => {
    const item = { step: 'location', answer: { key: 'x.y', fallbackText: 'Stored words' }, at: '', rev: 1 } as never;
    expect(host({ kind: 'history', intakeId: 'i', item }).text).toContain('Stored words');
  });
});

describe('notes and fallbacks', () => {
  it('a step another work package owns shows its prompt and fallbackText — no dead end', () => {
    const h = host(fx.locationStep());
    expect(h.text).toContain('Where is it picked up?');
    expect(h.text).toContain('Athens Warehouse');
    expect(h.text).toContain("I couldn't find");
  });
  it('confirm-discard is Yes / No', () => {
    const e = fx.confirmDiscardStep();
    const h = host(e);
    expect(h.text).toContain('Discard this load?');
    const buttons = findAll(h.tree, (n) => n.type === 'button');
    expect(buttons).toHaveLength(2);
    click(buttons[0]); click(buttons[1]);
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'confirm_discard', confirm: true });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'confirm_discard', confirm: false });
  });
  it('a discard is a calm confirmation, an error is an alert with its fix', () => {
    expect(host(fx.discarded()).text).toContain('Discarded. Nothing was saved.');
    const err = host(fx.undoFailedError(true), { live: false });
    expect(err.el('intake-error')!.props.role).toBe('alert');
    expect(err.text).toContain('Try again in a moment');
  });
  it('an ai_paused error is the gateway\'s copy alone: no fix line, no retry, nothing to press', () => {
    const copy = 'ZZ-gateway-paused-copy (arrives in intake_error.message; the FE keeps none)';
    const e: IntakeEvent = { v: 1, type: 'error', intakeId: null, code: 'ai_paused', retryable: false, message: fx.txt('error.paused', copy), fix: null };
    const h = host(e, { live: false });
    expect(h.text).toBe(copy);
    expect(findAll(h.tree, (n) => n.type === 'button')).toHaveLength(0);
  });
  it('a paused notice under the done card has no Try again', () => {
    const copy = 'ZZ-gateway-paused-copy (a 403 body.error)';
    const h = host({ kind: 'event', event: fx.doneDraft(), notice: { tone: 'error', text: copy } });
    expect(h.text).toContain(copy);
    expect(h.ids).not.toContain('intake-retry');
  });
  it('a stale-step refusal shows no raw codes', () => {
    noRawKeys(host(fx.staleError()).text);
  });
});
