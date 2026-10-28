import { describe, expect, it } from 'vitest';
import type { ThreadMessage } from '../threadCards';
import type { AnswerResponse, FinishResponse, IntakeEvent, RestFail, UndoResponse } from './contract';
import * as fx from './fixtures/intakeFixtures';
import {
  appendIntakeEvents, applyOutcome, failureText, indexOfEvent, isLiveIntake, liveIndexByIntake, markAnswered,
  newestLiveIntakeIndex, noticeOfThrown, outcomeOfAnswer, outcomeOfFinish, outcomeOfUndo, seedFromStart, setNotice,
} from './intakeThread';

const user = (text: string): ThreadMessage => ({ who: 'user', text });
const events = (th: ThreadMessage[]): IntakeEvent[] => th.flatMap((m) => (m.intake?.kind === 'event' ? [m.intake.event] : []));
const GENERIC = 'Something went wrong.';
const fail = (p: Partial<RestFail>): RestFail => ({ ok: false, code: 'x', ...p } as RestFail);

describe('replace by intakeId — the newest widget is live, earlier ones are spent rows', () => {
  it('only the newest step of an intake is live', () => {
    const th = appendIntakeEvents([user('hi')], [fx.gateStep('en', 0), fx.describeStep(1)]);
    expect(th).toHaveLength(3);
    expect(isLiveIntake(th, 1)).toBe(false);
    expect(isLiveIntake(th, 2)).toBe(true);
    expect(isLiveIntake(th, 0)).toBe(false); // not an intake message
    expect(newestLiveIntakeIndex(th)).toBe(2);
  });
  it('nothing is ever removed from the transcript', () => {
    let th = appendIntakeEvents([], [fx.gateStep()]);
    th = appendIntakeEvents(th, [fx.describeStep(1)]);
    th = appendIntakeEvents(th, [fx.summaryComplete()]);
    expect(events(th).map((e) => e.type)).toEqual(['step', 'step', 'summary']);
  });
  it('two intakes each keep their own live widget', () => {
    const other = { ...fx.gateStep(), intakeId: 'int_other', stepId: 'int_other:0' };
    const th = appendIntakeEvents([], [fx.gateStep(), other]);
    expect([...liveIndexByIntake(th).keys()].sort()).toEqual(['int_9f1c', 'int_other']);
  });
  it('a re-send of the live event adds nothing', () => {
    const th = appendIntakeEvents([], [fx.gateStep()]);
    expect(appendIntakeEvents(th, [fx.gateStep()])).toHaveLength(1);
  });
  it('a re-send whose content changed at the same rev updates the live widget in place (blocked finish)', () => {
    let th = appendIntakeEvents([], [fx.summaryComplete()]);
    const blocked = { ...fx.summaryComplete(), gate: { draftOk: true, publishOk: false, reason: 'MYVAGON refused the price.', missing: [] } };
    th = appendIntakeEvents(th, [blocked]);
    expect(th).toHaveLength(1);
    const s = th[0]!.intake;
    expect(s?.kind === 'event' && s.event.type === 'summary' && s.event.gate.reason).toBe('MYVAGON refused the price.');
  });
});

describe('a discard closes its intake', () => {
  it('nothing of it is live afterwards — the summary cannot keep a working Save button', () => {
    let th = appendIntakeEvents([], [fx.summaryComplete()]);
    expect(isLiveIntake(th, 0)).toBe(true);
    th = appendIntakeEvents(th, [fx.discarded()]);
    expect(isLiveIntake(th, 0)).toBe(false);
    expect(newestLiveIntakeIndex(th)).toBe(-1);
  });
  it('a discard that opens a new load (followUp) leaves only the new load live', () => {
    const res: AnswerResponse = { ok: true, event: fx.discarded(true), followUp: { ...fx.gateStep(), intakeId: 'int_2b7e', stepId: 'int_2b7e:0' } } as AnswerResponse;
    let th = appendIntakeEvents([], [fx.summaryComplete()]);
    th = applyOutcome(th, 0, outcomeOfAnswer(res, GENERIC), null);
    expect(events(th).map((e) => e.type)).toEqual(['summary', 'discarded', 'step']);
    expect(isLiveIntake(th, 0)).toBe(false);
    expect(isLiveIntake(th, 2)).toBe(true);
  });
});

describe('intake_error', () => {
  it('an error that carries a step appends the note, then the step', () => {
    const th = appendIntakeEvents([], [fx.staleError(fx.gateStep())]);
    expect(events(th).map((e) => e.type)).toEqual(['error', 'step']);
    expect(isLiveIntake(th, 1)).toBe(true);
    expect(isLiveIntake(th, 0)).toBe(false); // a note is never a live widget
  });
  it('does not double the step when the page already has it live', () => {
    let th = appendIntakeEvents([], [fx.gateStep()]);
    th = appendIntakeEvents(th, [fx.staleError(fx.gateStep())]);
    expect(events(th).map((e) => e.type)).toEqual(['step', 'error']);
  });
});

describe('reopening a chat', () => {
  it('history answers become read-only rows, then the current event is live', () => {
    const th = seedFromStart([], { event: fx.summaryComplete(), history: fx.history() } as never, 'int_9f1c');
    expect(th.map((m) => m.intake?.kind)).toEqual(['history', 'history', 'history', 'history', 'event']);
    expect(isLiveIntake(th, 4)).toBe(true);
    expect(isLiveIntake(th, 0)).toBe(false);
  });
});

describe('annotating a widget', () => {
  it('markAnswered keeps the shipper\'s answer and clears the notice; setNotice keeps the answer', () => {
    let th = appendIntakeEvents([], [fx.gateStep()]);
    th = setNotice(th, 0, { tone: 'error', text: 'nope' });
    expect(th[0]!.intake?.kind === 'event' && th[0]!.intake.notice?.text).toBe('nope');
    th = markAnswered(th, 0, { key: 'gate.manual', fallbackText: 'Manually' });
    const s = th[0]!.intake;
    expect(s?.kind === 'event' && s.answered?.key).toBe('gate.manual');
    expect(s?.kind === 'event' && s.notice).toBeUndefined();
  });
  it('indexOfEvent finds the exact event', () => {
    const th = appendIntakeEvents([], [fx.gateStep('en', 0), fx.describeStep(1)]);
    expect(indexOfEvent(th, { intakeId: 'int_9f1c', type: 'step', rev: 0 })).toBe(0);
    expect(indexOfEvent(th, { intakeId: 'int_9f1c', type: 'step', rev: 9 })).toBe(-1);
  });
});

describe('outcomes of REST answers (§6)', () => {
  it('success → the next event, the used widget is spent', () => {
    const out = outcomeOfAnswer({ ok: true, event: fx.describeStep(1) } as AnswerResponse, GENERIC);
    expect(out.spent).toBe(true);
    expect(out.events).toHaveLength(1);
    expect(out.notice).toBeNull();
  });
  it('stale_step conflict re-renders the current state silently', () => {
    const out = outcomeOfAnswer(fail({ code: 'conflict', reason: 'stale_step', event: fx.describeStep(3) }) as AnswerResponse, GENERIC);
    expect(out.notice).toBeNull();
    expect(out.spent).toBe(false);
    expect(out.events).toHaveLength(1);
  });
  it('concurrent_write conflict says so', () => {
    const out = outcomeOfAnswer(fail({ code: 'conflict', reason: 'concurrent_write', message: 'Someone else changed this load.' }) as AnswerResponse, GENERIC);
    expect(out.notice?.text).toBe('Someone else changed this load.');
  });
  it('invalid_answer leaves the widget open with the reason under it', () => {
    const out = outcomeOfAnswer(fail({ code: 'invalid_answer', message: 'Pick one of the options.' }) as AnswerResponse, GENERIC);
    expect(out.spent).toBe(false);
    expect(out.events).toEqual([]);
    expect(out.notice).toEqual({ tone: 'error', text: 'Pick one of the options.' });
  });
  it('failureText prefers the gateway error (message + fix), then loose strings, then the generic line', () => {
    expect(failureText(fail({ error: { message: fx.txt('a', 'Said.'), fix: fx.txt('b', 'Do this.') } } as never), GENERIC)).toBe('Said. Do this.');
    expect(failureText(fail({ message: 'Loose', fix: 'Fix' }), GENERIC)).toBe('Loose Fix');
    expect(failureText(fail({}), GENERIC)).toBe(GENERIC);
  });
  it('blocked finish re-renders the summary with no error notice; the used widget is not spent', () => {
    const out = outcomeOfFinish(fail({ code: 'blocked', event: fx.summaryDraftBlocked() }) as FinishResponse, GENERIC);
    expect(out.spent).toBe(false);
    expect(out.notice).toBeNull();
    expect(out.events).toHaveLength(1);
  });
  it('finish success → the done card; finish_in_progress is informational', () => {
    expect(outcomeOfFinish({ ok: true, event: fx.doneDraft() } as FinishResponse, GENERIC).spent).toBe(true);
    const wait = outcomeOfFinish(fail({ code: 'finish_in_progress', message: 'Still saving…' }) as FinishResponse, GENERIC);
    expect(wait.notice?.tone).toBe('info');
    expect(wait.events).toEqual([]);
  });
  it('a retryable finish error offers Try again', () => {
    const out = outcomeOfFinish(fail({ code: 'upstream', error: { retryable: true, message: fx.txt('error.upstream', 'MYVAGON couldn\'t be reached.') } } as never) as FinishResponse, GENERIC);
    expect(out.notice?.retry).toBe('finish');
  });
  it('undo success reopens the summary; undo_failed is NEVER success and may offer Try again', () => {
    expect(outcomeOfUndo({ ok: true, event: fx.summaryComplete() } as UndoResponse, GENERIC).spent).toBe(true);
    const failed = outcomeOfUndo(fail({ code: 'undo_failed', error: { retryable: true, message: fx.txt('undo.failed', 'I couldn\'t remove the draft.') } } as never) as UndoResponse, GENERIC);
    expect(failed.spent).toBe(false);
    expect(failed.events).toEqual([]);
    expect(failed.notice?.retry).toBe('undo');
    const final = outcomeOfUndo(fail({ code: 'undo_failed', error: { retryable: false, message: fx.txt('undo.failed', 'x') } } as never) as UndoResponse, GENERIC);
    expect(final.notice?.retry).toBeUndefined();
  });
  it('applyOutcome: a spent widget keeps the answer; a refused one gets a notice and stays live', () => {
    const th0 = appendIntakeEvents([], [fx.gateStep()]);
    const ok = applyOutcome(th0, 0, outcomeOfAnswer({ ok: true, event: fx.describeStep(1) } as AnswerResponse, GENERIC), { key: 'gate.manual', fallbackText: 'Manually' });
    expect(ok).toHaveLength(2);
    expect(isLiveIntake(ok, 0)).toBe(false);
    const s = ok[0]!.intake;
    expect(s?.kind === 'event' && s.answered?.fallbackText).toBe('Manually');
    const refused = applyOutcome(th0, 0, outcomeOfAnswer(fail({ code: 'invalid_answer', message: 'Pick one.' }) as AnswerResponse, GENERIC), null);
    expect(refused).toHaveLength(1);
    expect(isLiveIntake(refused, 0)).toBe(true);
  });
});

describe('a request that threw (§6.1, §18.4)', () => {
  const gatewayError = (status: number, message: string) => Object.assign(new Error(message), { name: 'GatewayError', status });
  // The 403 body is `{ error: <string already localised by the gateway> }` and `gatewayFetch` carries it as the error's message
  // (§19.8). This suite keeps NO copy of the real sentence: any string the gateway sends must come back untouched.
  const PAUSED = 'ZZ-gateway-403-body (whatever the gateway localised) — do not retry now.';

  it('403 shows the gateway\'s own `error` string VERBATIM — no wrapper, no fix line, no retry', () => {
    const { notice, paused } = noticeOfThrown(gatewayError(403, PAUSED), GENERIC);
    expect(paused).toBe(true);
    expect(notice).toEqual({ tone: 'error', text: PAUSED });
    expect(notice.retry).toBeUndefined();
  });
  it('the Greek copy is passed through untouched too', () => {
    const el = 'ΖΖ-κείμενο του gateway στα ελληνικά — χωρίς επανάληψη.';
    expect(noticeOfThrown(gatewayError(403, el), GENERIC).notice.text).toBe(el);
  });
  it('a 403 with no copy of its own (body-less) is the generic line, not "Request failed (403)"', () => {
    for (const msg of ['Request failed (403)', '', '   ']) {
      const out = noticeOfThrown(gatewayError(403, msg), GENERIC);
      expect(out.notice.text).toBe(GENERIC);
      expect(out.paused).toBe(false);
    }
  });
  it('every other failure is one generic sentence — never a status code or the server\'s words', () => {
    for (const status of [400, 401, 404, 429, 502, 503]) {
      const out = noticeOfThrown(gatewayError(status, 'SQLSTATE[HY000] stack trace'), GENERIC);
      expect(out).toEqual({ notice: { tone: 'error', text: GENERIC }, paused: false });
    }
    expect(noticeOfThrown(new TypeError('Failed to fetch'), GENERIC).notice.text).toBe(GENERIC);
    expect(noticeOfThrown(undefined, GENERIC).notice.text).toBe(GENERIC);
    expect(noticeOfThrown('boom', GENERIC).notice.text).toBe(GENERIC);
  });
  it('an ai_paused error that arrives in a 200 body never offers Try again, even if flagged retryable', () => {
    const paused = fail({ code: 'upstream', error: { code: 'ai_paused', retryable: true, message: fx.txt('error.paused', PAUSED), fix: null } } as never);
    expect(outcomeOfFinish(paused as FinishResponse, GENERIC).notice?.retry).toBeUndefined();
    expect(outcomeOfUndo(paused as UndoResponse, GENERIC).notice?.retry).toBeUndefined();
  });
});
