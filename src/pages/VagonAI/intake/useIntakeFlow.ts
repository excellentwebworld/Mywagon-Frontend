/**
 * Page-side wiring for the intake widgets: binds `IntakeActions` to the REST routes and folds each response into
 * the transcript with the pure rules in `intakeThread.ts`. The page owns the transcript; this hook only asks it to change.
 *
 * One request at a time (`busy`): every widget is disabled while one is in flight, which is what makes a double
 * tap harmless on the client; the gateway's `stepId`/`rev` and `runId` make it harmless on the server too.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ThreadMessage } from '../threadCards';
import type {
  IntakeAnswerWire, IntakeDoneEvent, IntakeStepEvent, IntakeSummaryEvent, OptionsKind, OptionsQuery, OptionsResponse, RouteSummary,
} from './contract';
import { armFocusIntent } from './intakeFocus';
import { answerLabel, answerRequest } from './intakeModel';
import { routeForFinish, routeKeyOf, type RouteInfo } from './intakeRoute';
import { intakeApi, type IntakeApi } from './intakeService';
import {
  applyOutcome, indexOfEvent, liveIndexByIntake, noticeOfThrown, outcomeOfAnswer, outcomeOfFinish, outcomeOfUndo, seedFromStart, setNotice,
  withoutIntakeChatLines, type IntakeOutcome,
} from './intakeThread';
import type { IntakeActions } from './IntakeWidgetHostView';

export interface UseIntakeFlowOptions {
  thread: ThreadMessage[];
  setThread: (update: (th: ThreadMessage[]) => ThreadMessage[]) => void;
  /** The open chat — R1 needs it to start a load without a model turn. */
  conversationId: string | null;
  lang: string;
  /** A chat turn is streaming or a chat is loading: the widgets wait. */
  pageBusy: boolean;
  /** Typed text from the Describe widget — the page's own `send`. */
  send: (text: string) => void;
  /** "Yes, upload the file" was tapped: open the import flow's file picker. Called inside the tap (a picker needs a user gesture). */
  onUpload?: (event: IntakeStepEvent) => void;
  onOpenUrl: (url: string) => void;
  /** Measures the route for a finish that needs it (§8.5, §18.3). Absent ⇒ Publish stays off when `routeNeeded`. */
  measureRoute?: (event: IntakeSummaryEvent) => Promise<RouteSummary | null>;
  /** Whether this summary has what `measureRoute` needs (stop positions). Absent ⇒ any summary can be measured. */
  canMeasure?: (event: IntakeSummaryEvent) => boolean;
  /** Same measurement, with the "straight-line estimate" flag (§19.8): lets the summary say "≈ N km (estimate)". Absent ⇒ no indicator. */
  measureRouteInfo?: (event: IntakeSummaryEvent) => Promise<RouteInfo | null>;
  /** One generic sentence for "couldn't do that now", in the shipper's language. */
  unavailableText: string;
  /** The line for a Publish that needs a route this page could not measure. */
  routeFailedText: string;
  api?: IntakeApi;
}

export function useIntakeFlow(opts: UseIntakeFlowOptions) {
  const { thread, setThread, conversationId, lang, pageBusy, send, onOpenUrl, onUpload, measureRoute, measureRouteInfo, canMeasure, unavailableText, routeFailedText } = opts;
  const api = opts.api ?? intakeApi;
  const [requesting, setRequesting] = useState(false);
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const inFlight = useRef(false);
  const lastRetry = useRef<{ kind: 'finish'; event: IntakeSummaryEvent; intent: 'save_draft' | 'publish' } | { kind: 'undo'; event: IntakeDoneEvent } | null>(null);

  /** Runs one request: guards double-fire, folds the outcome into the transcript, turns a throw into a notice. */
  const run = useCallback(async (
    intakeId: string, anchor: { intakeId: string; type: string; rev: number },
    request: () => Promise<IntakeOutcome>, label: ReturnType<typeof answerLabel>,
  ) => {
    if (inFlight.current) return;
    inFlight.current = true;
    armFocusIntent(); // QA-1: the card this action brings takes keyboard focus (intakeFocus.ts)
    setRequesting(true);
    const liveOf = (th: ThreadMessage[]) => liveIndexByIntake(th).get(intakeId) ?? indexOfEvent(th, anchor);
    try {
      const outcome = await request();
      if (alive.current) setThread((th) => applyOutcome(th, liveOf(th), outcome, label));
    } catch (err) {
      // 403 = ai_paused: the gateway's own copy, verbatim, and nothing to retry (§18.4).
      const { notice, paused } = noticeOfThrown(err, unavailableText);
      if (paused) lastRetry.current = null;
      if (alive.current) setThread((th) => setNotice(th, liveOf(th), notice));
    } finally {
      inFlight.current = false;
      if (alive.current) setRequesting(false);
    }
  }, [setThread, unavailableText]);

  const answer = useCallback((event: IntakeStepEvent | IntakeSummaryEvent, wire: IntakeAnswerWire, shown?: string) => {
    void run(
      event.intakeId, event,
      async () => outcomeOfAnswer(await api.answer(event.intakeId, answerRequest(event, wire), lang), unavailableText),
      event.type === 'step' ? answerLabel(event, wire, shown) : null,
    );
  }, [api, lang, run, unavailableText]);

  /** §5.1: `upload` ⇒ the server marks the load as coming from orders; the page opens the import; `pick_orders` follows it. */
  const upload = useCallback((event: IntakeStepEvent) => {
    onUpload?.(event);
    answer(event, { step: 'upload_offer', choice: 'upload' });
  }, [answer, onUpload]);

  const finish = useCallback((event: IntakeSummaryEvent, intent: 'save_draft' | 'publish') => {
    lastRetry.current = { kind: 'finish', event, intent };
    void run(event.intakeId, event, async () => {
      // §18.3: the browser measures the route and sends it with the intent. Publish cannot go without it;
      // Save as draft is never blocked by it — a draft whose route could not be measured is saved without one.
      const { routeSummary, blocked } = await routeForFinish(event, intent, measureRoute, canMeasure);
      if (blocked) return { events: [], notice: { tone: 'error' as const, text: routeFailedText }, spent: false };
      return outcomeOfFinish(await api.finish(event.intakeId, {
        intent, runId: event.finishRunId, rev: event.rev, ...(routeSummary ? { routeSummary } : {}),
      }, lang), unavailableText);
    }, null);
  }, [api, canMeasure, lang, measureRoute, routeFailedText, run, unavailableText]);

  const undo = useCallback((event: IntakeDoneEvent) => {
    lastRetry.current = { kind: 'undo', event };
    void run(event.intakeId, event, async () => outcomeOfUndo(await api.undo(event.intakeId, { runId: event.runId, rev: event.rev }, lang), unavailableText), null);
  }, [api, lang, run, unavailableText]);

  const discard = useCallback((event: IntakeSummaryEvent) => {
    void run(event.intakeId, event, async () => outcomeOfAnswer(await api.discard(event.intakeId, { rev: event.rev }, lang), unavailableText), null);
  }, [api, lang, run, unavailableText]);

  /** Starts (or resumes) the chat's open load without a model turn (R1) — "Create another" and a "Create a shipment" chip. */
  const startLoad = useCallback(async (origin?: 'orders' | 'manual') => {
    if (inFlight.current || !conversationId) return;
    inFlight.current = true;
    armFocusIntent();
    setRequesting(true);
    try {
      const res = await api.start({ conversationId, ...(origin ? { origin } : {}) }, lang);
      if (!alive.current) return;
      if (res.ok) setThread((th) => seedFromStart(th, res, res.intakeId));
      else setThread((th) => applyOutcome(th, -1, outcomeOfAnswer(res, unavailableText), null));
    } catch (err) {
      const { notice } = noticeOfThrown(err, unavailableText);
      if (alive.current) setThread((th) => [...th, { who: 'ai', text: notice.text, isError: true }]);
    } finally {
      inFlight.current = false;
      if (alive.current) setRequesting(false);
    }
  }, [api, conversationId, lang, setThread, unavailableText]);

  /**
   * MS3-407: a chat reopened from the history panel gets its unfinished load back - the answered steps, then the step it
   * stopped at, live. A read (R1b): nothing is created. True when a load was put back; `isCurrent` is asked after the read,
   * so a shipper who has moved to another chat meanwhile is not handed this one's load.
   */
  const resume = useCallback(async (id: string, isCurrent: () => boolean): Promise<boolean> => {
    if (!api.open) return false;
    try {
      const res = await api.open(id, lang);
      if (!res.ok || typeof res.intakeId !== 'string' || !('event' in res) || !alive.current || !isCurrent()) return false;
      const intakeId = res.intakeId;
      setThread((th) => (liveIndexByIntake(th).has(intakeId) ? th : seedFromStart(withoutIntakeChatLines(th), res, intakeId)));
      return true;
    } catch {
      return false;
    }
  }, [api, lang, setThread]);

  const retry = useCallback((kind: 'finish' | 'undo') => {
    const last = lastRetry.current;
    if (!last || last.kind !== kind) return;
    if (last.kind === 'finish') finish(last.event, last.intent); else undo(last.event);
  }, [finish, undo]);

  /** R4 — a read, so it does not take the single-request lock and never throws (a throw is a `{ok:false}` the widget words). */
  const options = useCallback(async (event: IntakeStepEvent, kind: OptionsKind, query?: OptionsQuery): Promise<OptionsResponse> => {
    if (!api.options) return { ok: false, code: 'unavailable' };
    try {
      return await api.options(event.intakeId, kind, query, lang);
    } catch {
      return { ok: false, code: 'unavailable' };
    }
  }, [api, lang]);

  const actions = useMemo<IntakeActions>(() => ({
    answer, upload, sendText: send, finish, undo, discard, newLoad: () => { void startLoad(); }, open: onOpenUrl, retry, options,
  }), [answer, discard, finish, onOpenUrl, options, retry, send, startLoad, undo, upload]);

  /** Can THIS summary's route be measured? Publish is offered only when it can (or when no route is needed). */
  const canMeasureRouteFor = useCallback(
    (event: IntakeSummaryEvent) => !!measureRoute && (!canMeasure || canMeasure(event)),
    [canMeasure, measureRoute],
  );

  /* §19.8 — the distance behind a live summary, measured once per set of stops, only to say when it is an estimate.
     Publish never waits for this: it measures again (or reuses nothing) on its own path. */
  const [routeInfos, setRouteInfos] = useState<Record<string, { km: number; estimated: boolean }>>({});
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!measureRouteInfo) return;
    for (const index of liveIndexByIntake(thread).values()) {
      const s = thread[index]?.intake;
      if (s?.kind !== 'event' || s.event.type !== 'summary' || !s.event.routeNeeded) continue;
      const event = s.event;
      const key = routeKeyOf(event);
      if (!key || asked.current.has(key)) continue;
      asked.current.add(key);
      void measureRouteInfo(event).then((info) => {
        if (info && alive.current) setRouteInfos((m) => ({ ...m, [key]: { km: info.route.total_dist_km, estimated: info.estimated } }));
      }).catch(() => undefined);
    }
  }, [thread, measureRouteInfo]);
  const routeInfoFor = useCallback((event: IntakeSummaryEvent) => {
    const key = routeKeyOf(event);
    return key ? routeInfos[key] ?? null : null;
  }, [routeInfos]);

  return { actions, busy: requesting || pageBusy, routeInfoFor, startLoad, resume, canMeasureRoute: !!measureRoute, canMeasureRouteFor };
}
