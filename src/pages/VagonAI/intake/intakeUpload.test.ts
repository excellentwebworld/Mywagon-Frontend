import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ThreadMessage } from '../threadCards';
import { answerLabel } from './intakeModel';
import * as fx from './fixtures/intakeFixtures';
import { IntakeWidgetHostView, type IntakeActions } from './IntakeWidgetHostView';
import { handoffAfterImport, handoffTarget, pickOrdersAnswer, PICK_ORDERS_MAX } from './intakeUpload';
import { byTestId, click, makeExists, makeUi, render, textOf } from './intakeTestKit';

const msg = (event: Parameters<typeof asMsg>[0]): ThreadMessage => asMsg(event);
function asMsg(event: import('./contract').IntakeEvent): ThreadMessage {
  return { who: 'ai', text: '', intake: { kind: 'event', event } };
}
/** An ImportSummary reduced to what `createdOrderIds` reads. */
const summary = (items: { status: string; orderId: number | null }[]) => ({ items }) as never;

describe('the upload offer taps', () => {
  const actions = () => ({ answer: vi.fn(), upload: vi.fn(), sendText: vi.fn(), finish: vi.fn(), undo: vi.fn(), discard: vi.fn(), newLoad: vi.fn(), open: vi.fn(), retry: vi.fn() }) as unknown as IntakeActions & Record<keyof IntakeActions, ReturnType<typeof vi.fn>>;
  const host = (busy = false) => {
    const a = actions();
    const e = fx.uploadOfferStep();
    const r = render(createElement(IntakeWidgetHostView, { ui: makeUi('en'), exists: makeExists('en'), state: { kind: 'event', event: e }, live: true, busy, canMeasureRoute: true, actions: a }));
    return { a, e, r };
  };
  it('"Yes, upload the file" hands off to the import (it is not a plain answer from the widget)', () => {
    const { a, e, r } = host();
    click(byTestId(r.tree, 'intake-choice-upload'));
    expect(a.upload).toHaveBeenCalledWith(e);
    expect(a.answer).not.toHaveBeenCalled();
  });
  it('"No, continue" posts the answer', () => {
    const { a, e, r } = host();
    click(byTestId(r.tree, 'intake-choice-continue'));
    expect(a.answer).toHaveBeenCalledWith(e, { step: 'upload_offer', choice: 'continue' });
    expect(a.upload).not.toHaveBeenCalled();
  });
  it('does nothing while a request is in flight', () => {
    const { a, r } = host(true);
    click(byTestId(r.tree, 'intake-choice-upload'));
    expect(a.upload).not.toHaveBeenCalled();
    expect(textOf(r.tree)).toContain('Yes, upload the file');
  });
});

describe('pick_orders answer', () => {
  it('sends the ids, de-duplicated and trimmed', () => {
    expect(pickOrdersAnswer(['11', ' 13 ', '11', ''])).toEqual({ answer: { step: 'pick_orders', orderIds: ['11', '13'] }, used: 2, capped: false });
  });
  it('takes at most 20 and says it left some out', () => {
    const ids = Array.from({ length: 25 }, (_, i) => String(i + 1));
    const out = pickOrdersAnswer(ids);
    expect(PICK_ORDERS_MAX).toBe(20);
    expect(out.used).toBe(20);
    expect(out.capped).toBe(true);
    expect(out.answer).toMatchObject({ orderIds: ids.slice(0, 20) });
  });
  it('exactly 20 is not capped', () => {
    expect(pickOrdersAnswer(Array.from({ length: 20 }, (_, i) => String(i + 1))).capped).toBe(false);
  });
  it('no ids, no answer', () => {
    expect(pickOrdersAnswer([]).answer).toBeNull();
  });
  it('leaves a line saying how many orders were added', () => {
    const label = answerLabel(fx.pickOrdersStep(), { step: 'pick_orders', orderIds: ['1', '2', '3'] });
    expect(label).toEqual({ key: 'history.orders', params: { count: 3 }, fallbackText: 'Orders: 3' });
  });
});

describe('hand-off after an import', () => {
  const waiting = [msg(fx.pickOrdersStep(2))];
  const handoff = { intakeId: 'int_9f1c' };
  it('is idle without a hand-off (an ordinary import)', () => {
    expect(handoffAfterImport(waiting, null, summary([{ status: 'created', orderId: 1 }]))).toEqual({ kind: 'idle' });
  });
  it('finds the live pick_orders step', () => {
    expect(handoffTarget(waiting, handoff)?.step).toBe('pick_orders');
  });
  it('posts the created AND updated order ids to that step', () => {
    const res = handoffAfterImport(waiting, handoff, summary([
      { status: 'created', orderId: 11 }, { status: 'failed', orderId: null }, { status: 'updated', orderId: 13 }, { status: 'skipped', orderId: 14 },
    ]));
    expect(res).toMatchObject({ kind: 'post', used: 2, capped: false, wire: { step: 'pick_orders', orderIds: ['11', '13'] } });
    expect(res.kind === 'post' && res.event.stepId).toBe('int_9f1c:2');
  });
  it('an import that wrote nothing says so and keeps the hand-off open', () => {
    expect(handoffAfterImport(waiting, handoff, summary([{ status: 'failed', orderId: null }]))).toEqual({ kind: 'empty' });
  });
  it('drops the hand-off once the load moved on (the shipper typed instead, or discarded)', () => {
    const moved = [...waiting, msg(fx.describeStep(3))];
    expect(handoffAfterImport(moved, handoff, summary([{ status: 'created', orderId: 1 }]))).toEqual({ kind: 'moved_on' });
    const discarded = [...waiting, msg(fx.discarded())];
    expect(handoffTarget(discarded, handoff)).toBeNull();
  });
  it('ignores another load', () => {
    expect(handoffTarget(waiting, { intakeId: 'int_other' })).toBeNull();
  });
});
