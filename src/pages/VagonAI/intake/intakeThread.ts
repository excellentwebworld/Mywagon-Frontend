/**
 * How intake events live in the Vagon AI transcript.
 *
 * One rule from CONTRACT.md §8.1: **replace by `intakeId`**. The newest step / summary / done event of an
 * intake is the live widget; every earlier one stays in the transcript as a read-only row showing what the
 * shipper answered. Nothing here is removed — a spent widget is a record, like an answered card list.
 *
 * Pure functions over the transcript, so the rules can be tested without a DOM (the repo's vitest is `node`).
 */
import type { ThreadMessage } from '../threadCards';
import type {
  AnswerResponse, FinishResponse, HistoryItem, IntakeDoneEvent, IntakeErrorEvent, IntakeEvent, IntakeSummaryEvent,
  LocalisableText, RestFail, StartOk, UndoResponse,
} from './contract';

/** A line under a widget: a refused answer, a lost race, a failed undo. */
export interface IntakeNotice {
  tone: 'error' | 'info';
  text: string;
  /** What "Try again" repeats, when repeating the same request unchanged may succeed. */
  retry?: 'finish' | 'undo';
}

export type IntakeMessageState =
  | { kind: 'event'; event: IntakeEvent; answered?: LocalisableText; notice?: IntakeNotice }
  /** A past answer restored from `history[]` on reopen (R1 / R2). Always read-only. */
  | { kind: 'history'; intakeId: string; item: HistoryItem };

/** Events that are a widget (can be live). `error` and `discarded` are notes: they say something and end. */
export const isWidgetEvent = (e: IntakeEvent): e is Exclude<IntakeEvent, IntakeErrorEvent | Extract<IntakeEvent, { type: 'discarded' }>> => (
  e.type === 'step' || e.type === 'summary' || e.type === 'done'
);

/**
 * Index of the newest widget event per intake. A discard closes its intake: nothing of it stays live after
 * `intake_discarded` (its summary must not keep a working Save button for a load that no longer exists).
 */
export function liveIndexByIntake(th: ThreadMessage[]): Map<string, number> {
  const live = new Map<string, number>();
  th.forEach((m, i) => {
    const s = m.intake;
    if (s?.kind !== 'event') return;
    if (isWidgetEvent(s.event)) live.set(s.event.intakeId, i);
    else if (s.event.type === 'discarded') live.delete(s.event.intakeId);
  });
  return live;
}

/** Is message `i` the live widget of its intake? */
export function isLiveIntake(th: ThreadMessage[], i: number): boolean {
  const s = th[i]?.intake;
  if (s?.kind !== 'event' || !isWidgetEvent(s.event)) return false;
  return liveIndexByIntake(th).get(s.event.intakeId) === i;
}

/** The newest live widget in the transcript, whatever its intake — the one a "new load" or an answer concerns. */
export function newestLiveIntakeIndex(th: ThreadMessage[]): number {
  let found = -1;
  for (const i of liveIndexByIntake(th).values()) if (i > found) found = i;
  return found;
}

const eventMessage = (event: IntakeEvent): ThreadMessage => ({ who: 'ai', text: '', intake: { kind: 'event', event } });
const historyMessage = (intakeId: string, item: HistoryItem): ThreadMessage => ({ who: 'ai', text: '', intake: { kind: 'history', intakeId, item } });

/** Index of the live widget this event merely re-sends (same intake, same rev, same kind), or -1. */
const liveResendOf = (th: ThreadMessage[], event: IntakeEvent): number => {
  if (!isWidgetEvent(event)) return -1;
  const i = liveIndexByIntake(th).get(event.intakeId);
  const s = i === undefined ? undefined : th[i]?.intake;
  return i !== undefined && s?.kind === 'event' && isWidgetEvent(s.event) && s.event.type === event.type && s.event.rev === event.rev ? i : -1;
};

/**
 * Appends events (an SSE frame, or a REST `event` + `followUp`) as assistant messages.
 * A re-send of the live event adds nothing — unless its content changed at the same rev (a `blocked` finish
 * answers with the same summary, now naming what Laravel refused), in which case the live widget is updated in place.
 */
export function appendIntakeEvents(th: ThreadMessage[], events: IntakeEvent[]): ThreadMessage[] {
  let next = th;
  for (const event of events) {
    const again = liveResendOf(next, event);
    if (again >= 0) {
      const s = next[again]!.intake;
      if (s?.kind === 'event' && JSON.stringify(s.event) !== JSON.stringify(event)) {
        next = next.map((m, i) => (i === again ? { ...m, intake: { ...s, event } } : m));
      }
      continue;
    }
    next = [...next, eventMessage(event)];
    // An error that carries the step to fall back to (§8.12): the note, then the live widget under it.
    if (event.type === 'error' && event.event && liveResendOf(next, event.event) < 0) {
      next = [...next, eventMessage(event.event)];
    }
  }
  return next;
}

/**
 * The one line the gateway's chat turn says when it hands over to a widget (gateway copy `chat.step` / `chat.summary`, both
 * languages). In a transcript reopened from the history panel it stands alone, with no widget under it - so once the load
 * itself is put back (MS3-407) these lines go: the restored answers and the live step say it instead.
 */
const INTAKE_CHAT_LINES = new Set([
  "Here's the next step.",
  'Να το επόμενο βήμα.',
  "Here's your shipment summary - check it, then choose what to do.",
  'Να η σύνοψη του φορτίου σου - έλεγξέ την και διάλεξε τι θα κάνεις.',
]);
export const withoutIntakeChatLines = (th: ThreadMessage[]): ThreadMessage[] =>
  th.filter((m) => !(m.who === 'ai' && !m.intake && INTAKE_CHAT_LINES.has(m.text.trim())));

/** Reopening a chat: the answered rows from `history[]`, then the current event as the live widget (R1 / R2). */
export function seedFromStart(th: ThreadMessage[], res: Pick<StartOk, 'event' | 'history'>, intakeId: string): ThreadMessage[] {
  return appendIntakeEvents([...th, ...res.history.map((item) => historyMessage(intakeId, item))], [res.event]);
}

/** Records the shipper's answer on the widget they just used, and clears any earlier notice on it. */
export function markAnswered(th: ThreadMessage[], index: number, answered: LocalisableText | null): ThreadMessage[] {
  return th.map((m, i) => {
    const s = m.intake;
    if (i !== index || s?.kind !== 'event') return m;
    return { ...m, intake: { kind: 'event', event: s.event, ...(answered ? { answered } : {}) } };
  });
}

export function setNotice(th: ThreadMessage[], index: number, notice: IntakeNotice | null): ThreadMessage[] {
  return th.map((m, i) => {
    const s = m.intake;
    if (i !== index || s?.kind !== 'event') return m;
    return { ...m, intake: { kind: 'event', event: s.event, ...(s.answered ? { answered: s.answered } : {}), ...(notice ? { notice } : {}) } };
  });
}

/**
 * A request that THREW (`gatewayFetch` throws on every non-2xx), as the line to show under the widget (§6.1, §18.4).
 *  - 403 is the kill switch (`ai_paused`). The body is `{ error: <string the gateway already localised> }` (§19.8) and
 *    `gatewayFetch` carries it as the error's message: shown VERBATIM — no wrapper, no fix line, never a Try again, and this
 *    app keeps no copy of the sentence (it would drift; the wording is fixed on the gateway).
 *  - anything else: one generic "couldn't do that right now" sentence, never a status code. A body-less failure
 *    (`Request failed (403)`) has no copy to show, so it is generic too.
 * Duck-typed on `GatewayError` so this stays free of the network layer (and testable in node).
 */
export function noticeOfThrown(err: unknown, unavailable: string): { notice: IntakeNotice; paused: boolean } {
  const e = (typeof err === 'object' && err !== null ? err : {}) as { name?: unknown; status?: unknown; message?: unknown };
  const message = typeof e.message === 'string' ? e.message : '';
  const hasCopy = message.trim().length > 0 && !/^Request failed \(\d+\)$/.test(message.trim());
  if (e.name === 'GatewayError' && e.status === 403 && hasCopy) return { notice: { tone: 'error', text: message }, paused: true };
  return { notice: { tone: 'error', text: unavailable }, paused: false };
}

/* ── Reading a REST response ── */

export interface IntakeOutcome {
  /** Events to render, oldest first. */
  events: IntakeEvent[];
  /** Said under the widget the shipper just used. */
  notice: IntakeNotice | null;
  /** The shipper's action took effect: the widget they used is spent and keeps their answer. */
  spent: boolean;
}

const sentence = (...parts: (string | null | undefined)[]): string => parts.filter((p): p is string => !!p && p.trim().length > 0).join(' ');

/** The line to show for a refusal: the gateway's `error` (message + fix) first, then the loose strings. */
export function failureText(res: RestFail, generic: string): string {
  return sentence(res.error?.message.text ?? res.message, res.error?.fix?.text ?? res.fix) || generic;
}

/**
 * Turns an answer / discard response into what the page does about it (§6.2, §6.5, §8.13).
 *  - success → the next event (+ `followUp` after a discard that opened a new load);
 *  - `conflict`/`stale_step` → re-render the current state silently; `concurrent_write` → also say so;
 *  - `invalid_answer` → nothing changes, the open widget says why;
 *  - anything else → say it; render `event` only if the gateway sent a different current state.
 */
export function outcomeOfAnswer(res: AnswerResponse, generic: string): IntakeOutcome {
  if (res.ok) {
    return { events: [res.event, ...(res.followUp ? [res.followUp] : [])], notice: null, spent: res.event.type !== 'error' };
  }
  if (res.code === 'conflict') {
    return {
      events: res.event ? [res.event] : [],
      notice: res.reason === 'concurrent_write' ? { tone: 'error', text: failureText(res, generic) } : null,
      spent: false,
    };
  }
  return { events: res.event ? [res.event] : [], notice: { tone: 'error', text: failureText(res, generic) }, spent: false };
}

/** Finish (R5): done, or blocked (the summary again, now with what is missing), or in progress, or an error. */
export function outcomeOfFinish(res: FinishResponse, generic: string): IntakeOutcome {
  if (res.ok) return { events: [res.event], notice: null, spent: true };
  if (res.code === 'blocked' || res.code === 'conflict') {
    return {
      events: res.event ? [res.event] : [],
      notice: res.code === 'blocked' ? null : (res.reason === 'concurrent_write' ? { tone: 'error', text: failureText(res, generic) } : null),
      spent: false,
    };
  }
  if (res.code === 'finish_in_progress') {
    return { events: [], notice: { tone: 'info', text: failureText(res, generic) }, spent: false };
  }
  return { events: res.event ? [res.event] : [], notice: { tone: 'error', text: failureText(res, generic), ...(res.error?.retryable && res.error.code !== 'ai_paused' ? { retry: 'finish' as const } : {}) }, spent: false };
}

/**
 * Undo (R6, C1): success reopens the summary; `undo_failed` is NEVER reported as success — the done card stays
 * live with the error and, when `retryable`, a Try again that re-posts the same request.
 */
export function outcomeOfUndo(res: UndoResponse, generic: string): IntakeOutcome {
  if (res.ok) return { events: [res.event], notice: null, spent: true };
  if (res.code === 'undo_failed') {
    return { events: [], notice: { tone: 'error', text: failureText(res, generic), ...(res.error?.retryable && res.error.code !== 'ai_paused' ? { retry: 'undo' as const } : {}) }, spent: false };
  }
  return { events: res.event ? [res.event] : [], notice: { tone: 'error', text: failureText(res, generic) }, spent: false };
}

/** Applies an outcome to the transcript: the used widget is spent or annotated, then the new events follow it. */
export function applyOutcome(
  th: ThreadMessage[], liveIndex: number, outcome: IntakeOutcome, answered: LocalisableText | null,
): ThreadMessage[] {
  let next = th;
  if (liveIndex >= 0) {
    next = outcome.spent ? markAnswered(next, liveIndex, answered) : setNotice(next, liveIndex, outcome.notice);
  }
  return appendIntakeEvents(next, outcome.events);
}

/** Convenience for the summary → finish request: the run id the gateway handed out with this summary. */
export const finishRunIdOf = (e: IntakeSummaryEvent): string => e.finishRunId;
export const doneUndoRunId = (e: IntakeDoneEvent): string => e.runId;

/** The transcript index of the message showing exactly this event (same intake, kind and rev), or -1. */
export function indexOfEvent(th: ThreadMessage[], event: { intakeId: string; type: string; rev: number }): number {
  for (let i = th.length - 1; i >= 0; i -= 1) {
    const s = th[i]?.intake;
    if (s?.kind === 'event' && s.event.intakeId === event.intakeId && s.event.type === event.type && 'rev' in s.event && s.event.rev === event.rev) return i;
  }
  return -1;
}
