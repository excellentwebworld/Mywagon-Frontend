/**
 * Release review 2026-10-20: MS3-404 (several orders: one load or one per order), MS3-405 (optional order number),
 * MS3-407 (a reopened chat gets its load back) and the multi-draft done card. Shapes are the gateway's own (events.ts).
 */
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { IntakeDoneEvent, IntakeEvent, IntakeStepEvent, Txt } from './contract';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import { answerLabel, orderNumberOf, stepViewOf } from './intakeModel';
import { seedFromStart, withoutIntakeChatLines } from './intakeThread';
import { allTestIds, byTestId, click, makeExists, makeUi, render, textOf } from './intakeTestKit';
import type { ThreadMessage } from '../threadCards';

const txt = (key: string, text: string): Txt => ({ key, text });

const actions = (): IntakeActions & { [K in keyof IntakeActions]: ReturnType<typeof vi.fn> } => ({
  answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn(),
}) as never;

function host(event: IntakeEvent, o: { states?: unknown[]; live?: boolean } = {}) {
  const a = actions();
  const r = render(createElement(IntakeWidgetHostView, {
    ui: makeUi('en'), exists: makeExists('en'), state: { kind: 'event', event }, live: o.live ?? true, busy: false, canMeasureRoute: true, actions: a,
  }), o.states);
  return { ...r, a, text: textOf(r.tree), ids: allTestIds(r.tree), el: (id: string) => byTestId(r.tree, id) };
}

const step = (kind: IntakeStepEvent['step'], widget: Record<string, unknown>, prompt: Txt): IntakeStepEvent => ({
  v: 1, type: 'step', intakeId: 'i1', stepId: 'i1:3', rev: 3, step: kind, editing: false, prompt, notices: [], known: [], remaining: 4,
  canExpress: false, canToSummary: false, fallbackText: prompt.text, widget: { kind, ...widget } as IntakeStepEvent['widget'],
});

const splitStep = () => step('order_split', {
  count: 2,
  options: [{ id: 'combined', label: txt('split.combined', 'Group all into one load') }, { id: 'per_order', label: txt('split.perOrder', 'Create one load per order') }],
}, txt('split.prompt', 'You picked 2 orders. How should they ship?'));

const numberStep = (extra: Record<string, unknown> = {}) => step('order_number', {
  value: null,
  placeholder: txt('orderNumber.placeholder', 'Order number'),
  save: txt('orderNumber.save', 'Add order number'),
  skip: txt('orderNumber.skip', 'Skip, no order'),
  maxLength: 100,
  ...extra,
}, txt('orderNumber.prompt', 'Do you have an order number for this load?'));

describe('MS3-404 — two or more orders: one combined load, or one load per order', () => {
  it('shows exactly the two choices; a tap is the answer', () => {
    const e = splitStep();
    const h = host(e);
    expect(h.ids).toEqual(expect.arrayContaining(['intake-choice-combined', 'intake-choice-per_order']));
    expect(h.text).toContain('You picked 2 orders');
    click(h.el('intake-choice-per_order'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'order_split', mode: 'per_order' });
  });
  it('the spent choice keeps the label the shipper tapped', () => {
    expect(answerLabel(splitStep(), { step: 'order_split', mode: 'combined' })).toEqual({ key: 'split.combined', params: undefined, fallbackText: 'Group all into one load' });
  });
  it('a malformed split payload degrades to the text step, never an empty card', () => {
    expect(stepViewOf(step('order_split', { options: [] }, txt('split.prompt', 'x'))).kind).toBe('text');
  });
});

describe('MS3-405 — the optional order number', () => {
  it('Add posts the trimmed number; Skip posts null', () => {
    const e = numberStep();
    const h = host(e, { states: ['  PO-77 '] });
    click(h.el('intake-ordernumber-save'));
    click(h.el('intake-ordernumber-skip'));
    expect(h.a.answer).toHaveBeenNthCalledWith(1, e, { step: 'order_number', orderNumber: 'PO-77' });
    expect(h.a.answer).toHaveBeenNthCalledWith(2, e, { step: 'order_number', orderNumber: null });
  });
  it('Add is off while nothing usable is typed', () => {
    const h = host(numberStep(), { states: ['   '] });
    expect(byTestId(h.tree, 'intake-ordernumber-save')!.props.disabled).toBe(true);
    expect(orderNumberOf('x'.repeat(101))).toBeNull();
  });
  it('a number that is already an order: link to it, or type another - never a duplicate', () => {
    const e = numberStep({
      value: 'PO-900',
      exists: { number: 'PO-900', orderId: '900', text: txt('orderNumber.exists', 'Order PO-900 is already in your Order List.'), link: txt('orderNumber.link', 'Link this load to it'), other: txt('orderNumber.other', 'Use a different number') },
    });
    const h = host(e, { states: ['PO-900'] });
    expect(h.text).toContain('already in your Order List');
    expect(h.el('intake-ordernumber-save')).toBeUndefined();
    click(h.el('intake-ordernumber-link'));
    expect(h.a.answer).toHaveBeenCalledWith(e, { step: 'order_number', orderNumber: 'PO-900', link: true });
    click(h.el('intake-ordernumber-other'));
    expect(h.setCalls).toEqual([{ index: 0, value: '' }]);
  });
  it('the spent step keeps the same line the gateway history stores', () => {
    const e = numberStep();
    expect(answerLabel(e, { step: 'order_number', orderNumber: null })?.key).toBe('history.orderNumberSkip');
    expect(answerLabel(e, { step: 'order_number', orderNumber: 'PO-1', link: true })?.params).toEqual({ number: 'PO-1' });
  });
});

describe('MS3-404 — the done card of "one load per order"', () => {
  const done: IntakeDoneEvent = {
    v: 1, type: 'done', intakeId: 'i1', rev: 9, outcome: 'draft', draftId: 1, autoId: 'SID-1', url: '/a',
    message: txt('done.drafts', "Saved 2 drafts, one per order. You'll find them in Manage Shipments."),
    warnings: [], unsupported: [], runId: 'r',
    drafts: [
      { draftId: 1, autoId: 'SID-1', url: '/a', orderRef: 'PO-900', label: txt('done.draftOf', 'Order PO-900: draft SID-1') },
      { draftId: 2, autoId: 'SID-2', url: '/b', orderRef: 'PO-901', label: txt('done.draftOf', 'Order PO-901: draft SID-2') },
    ],
    undo: { available: true, kind: 'discard_draft', label: txt('undo.label', 'Undo') },
    next: { openUrl: txt('done.open', 'Open shipment'), newLoad: txt('done.new', 'Create another') },
  };
  it('lists every draft with its own link, and no single Open button', () => {
    const h = host(done);
    expect(h.text).toContain('Order PO-901: draft SID-2');
    expect(h.el('intake-open')).toBeUndefined();
    click(h.el('intake-open-2'));
    expect(h.a.open).toHaveBeenCalledWith('/b');
    expect(h.el('intake-undo')).toBeDefined();
  });
});

describe('MS3-407 — a reopened chat gets its unfinished load back', () => {
  const transcript: ThreadMessage[] = [
    { who: 'user', text: 'Create a new shipment for me.' },
    { who: 'ai', text: "Here's the next step." },
    { who: 'user', text: 'manually' },
    { who: 'ai', text: 'Να το επόμενο βήμα.' },
  ];
  it('the bare hand-over lines go, the conversation stays', () => {
    expect(withoutIntakeChatLines(transcript).map((m) => m.text)).toEqual(['Create a new shipment for me.', 'manually']);
  });
  it('the answered steps come back as rows, then the step it stopped at, live', () => {
    const live = numberStep();
    const th = seedFromStart(withoutIntakeChatLines(transcript), {
      event: live,
      history: [{ step: 'gate', answer: { key: 'history.gate.manual', fallbackText: 'Entering it manually' }, at: '2026-10-20T08:00:00Z', rev: 1 }],
    }, 'i1');
    expect(th.map((m) => m.intake?.kind ?? m.who)).toEqual(['user', 'user', 'history', 'event']);
  });
});
