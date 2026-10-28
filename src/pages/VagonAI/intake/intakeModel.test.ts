import { describe, expect, it } from 'vitest';
import {
  answerLabel, answerRequest, asIntakeEvent, describeText, intakeSseName, jumpTargets, stepViewOf,
} from './intakeModel';
import * as fx from './fixtures/intakeFixtures';

describe('asIntakeEvent — validates, never casts', () => {
  it('accepts every fixture event', () => {
    for (const e of [fx.gateStep(), fx.describeStep(), fx.uploadOfferStep(), fx.locationStep(), fx.confirmDiscardStep(), fx.summaryMissingPrice(), fx.summaryComplete(), fx.doneDraft(), fx.doneUnknown(), fx.discarded(), fx.staleError()]) {
      expect(asIntakeEvent(JSON.parse(JSON.stringify(e)))?.type).toBe(e.type);
    }
  });
  it('ignores an unknown type or a version other than 1 (CONTRACT §0.3)', () => {
    expect(asIntakeEvent({ ...fx.gateStep(), type: 'banner' })).toBeNull();
    expect(asIntakeEvent({ ...fx.gateStep(), v: 2 })).toBeNull();
    expect(asIntakeEvent(null)).toBeNull();
    expect(asIntakeEvent('step')).toBeNull();
    expect(asIntakeEvent([])).toBeNull();
  });
  it('rejects events missing what the host reads', () => {
    const { stepId: _s, ...noStepId } = fx.gateStep();
    expect(asIntakeEvent(noStepId)).toBeNull();
    expect(asIntakeEvent({ ...fx.gateStep(), prompt: 'plain string' })).toBeNull();
    expect(asIntakeEvent({ ...fx.summaryComplete(), rows: undefined })).toBeNull();
    expect(asIntakeEvent({ ...fx.summaryComplete(), finishRunId: '' })).toBeNull();
    expect(asIntakeEvent({ ...fx.doneDraft(), undo: undefined })).toBeNull();
  });
  it('fills optional arrays so a lean gateway frame cannot crash a widget', () => {
    const lean = { ...fx.gateStep(), notices: undefined, known: undefined, canExpress: undefined, fallbackText: undefined };
    const e = asIntakeEvent(lean);
    expect(e?.type === 'step' && e.notices).toEqual([]);
    expect(e?.type === 'step' && e.canExpress).toBe(false);
    expect(e?.type === 'step' && e.fallbackText).toBe('');
  });
  it('keeps an unknown STEP / widget kind as a valid step (rendered from fallbackText)', () => {
    const e = asIntakeEvent({ ...fx.gateStep(), step: 'hologram', widget: { kind: 'hologram' } });
    expect(e?.type).toBe('step');
    if (e?.type === 'step') expect(stepViewOf(e).kind).toBe('text');
  });
  it('an intake_error carries and validates its fall-back event', () => {
    const e = asIntakeEvent(JSON.parse(JSON.stringify(fx.staleError(fx.gateStep()))));
    expect(e?.type === 'error' && e.event?.type).toBe('step');
    const bad = asIntakeEvent({ ...fx.staleError(), event: { v: 1, type: 'step' } });
    expect(bad?.type === 'error' && bad.event).toBeUndefined();
  });
});

describe('intakeSseName', () => {
  it('knows the five intake frames and nothing else', () => {
    for (const n of ['intake_step', 'intake_summary', 'intake_done', 'intake_error', 'intake_discarded']) expect(intakeSseName(n)).toBe(n);
    for (const n of ['token', 'tool_call', 'intake_banner', 'toString']) expect(intakeSseName(n)).toBeNull();
  });
});

describe('stepViewOf', () => {
  it('picks the widget the kind names', () => {
    expect(stepViewOf(fx.gateStep()).kind).toBe('gate');
    expect(stepViewOf(fx.uploadOfferStep()).kind).toBe('upload_offer');
    expect(stepViewOf(fx.describeStep()).kind).toBe('describe');
    expect(stepViewOf(fx.confirmDiscardStep()).kind).toBe('confirm_discard');
    expect(stepViewOf(fx.locationStep()).kind).toBe('text'); // WP3b owns it
  });
  it('degrades to text when the spec is malformed', () => {
    expect(stepViewOf({ ...fx.gateStep(), widget: { kind: 'gate', options: [] } }).kind).toBe('text');
    expect(stepViewOf({ ...fx.describeStep(), widget: { kind: 'describe' } as never }).kind).toBe('text');
  });
});

describe('answers', () => {
  it('every answer carries stepId + rev of the event on screen (v0.2)', () => {
    const e = fx.gateStep('en', 4);
    expect(answerRequest(e, { step: 'gate', origin: 'orders' })).toEqual({ stepId: 'int_9f1c:4', rev: 4, answer: { step: 'gate', origin: 'orders' } });
  });
  it('the line a spent widget keeps is the chosen option as {key, params, fallbackText}', () => {
    expect(answerLabel(fx.gateStep(), { step: 'gate', origin: 'manual' })).toEqual({ key: 'gate.manual', params: undefined, fallbackText: 'Manually' });
    expect(answerLabel(fx.uploadOfferStep(), { step: 'upload_offer', choice: 'upload' })?.key).toBe('upload.yes');
    expect(answerLabel(fx.describeStep(), { step: 'describe', choice: 'step_by_step' })?.key).toBe('describe.stepByStep');
    expect(answerLabel(fx.confirmDiscardStep(), { step: 'confirm_discard', confirm: true })?.key).toBe('cancel.yes');
    expect(answerLabel(fx.confirmDiscardStep(), { step: 'confirm_discard', confirm: false })?.key).toBe('cancel.no');
    expect(answerLabel(fx.gateStep(), { step: 'express', mode: 'defaults' })).toBeNull();
    expect(answerLabel(fx.gateStep(), { step: 'gate', origin: 'nope' as never })).toBeNull();
  });
});

describe('describeText', () => {
  it('trims and collapses whitespace; empty is nothing to send', () => {
    expect(describeText('  10 pallets \n to  Ioannina ')).toBe('10 pallets to Ioannina');
    expect(describeText('   \n ')).toBeNull();
    expect(describeText('')).toBeNull();
  });
});

describe('jumpTargets', () => {
  it('one link per distinct missing item, never to the summary itself', () => {
    const missing = fx.summaryDraftBlocked().gate.missing;
    const out = jumpTargets(missing);
    expect(out.map((o) => o.step)).toEqual(['location', 'cargo']);
    expect(out[0]).toEqual({ step: 'location', stopKey: 's1', label: 'Site' });
    expect(jumpTargets([...missing, ...missing])).toHaveLength(2);
  });
});
