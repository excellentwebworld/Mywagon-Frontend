/**
 * The intake REST routes (CONTRACT.md §6.3) — plain authenticated JSON calls, no model turn.
 *
 *   R1 POST /chat/shipment-intake                 start / resume
 *   R1b GET /chat/shipment-intake?conversationId  the chat's unfinished load, read only (MS3-407)
 *   R2 GET  /chat/shipment-intake/:id             current event + history
 *   R3 POST /chat/shipment-intake/:id/answer      a widget answer → next event
 *   R5 POST /chat/shipment-intake/:id/finish      Save as draft / Publish now
 *   R6 POST /chat/shipment-intake/:id/undo        undo a saved draft ({runId, rev})
 *   R7 POST /chat/shipment-intake/:id/discard     cancel the whole load ({rev})
 *   R4 GET  /chat/shipment-intake/:id/options/:kind  big lists for the pickers (WP3b)
 *
 * Business outcomes are HTTP 200 with `ok:false` (§6.1), so `gatewayFetch` — which throws on non-2xx and
 * keeps only a message — never hides `missing[]` or the current event. It DOES throw for 400/401/403/404/429/
 * 502/503; `gatewayFailure` turns that into the same notice shape the 200 failures use.
 *
 * The dev proxy already forwards `^/chat([/?]|$)`, so these paths need no vite.config change.
 */
import { getStoredToken } from '../../../api/client';
import { gatewayFetch } from '../../../api/chatGatewayUrl';
import { noticeOfThrown } from './intakeThread';
import type {
  AnswerRequest, AnswerResponse, DiscardResponse, FinishRequest, FinishResponse, GetResponse, OpenResponse, UnfinishedResponse, OptionsKind, OptionsQuery, OptionsResponse,
  StartResponse, UndoResponse,
} from './contract';

const BASE = '/chat/shipment-intake';
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

async function call<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown; locale?: string; signal?: AbortSignal }): Promise<T> {
  const response = await gatewayFetch(path, {
    method: init.method,
    token: getStoredToken(),
    locale: init.locale,
    signal: init.signal,
    ...(init.body === undefined ? {} : { headers: JSON_HEADERS, body: JSON.stringify(init.body) }),
  });
  return (await response.json()) as T;
}

const id = (intakeId: string) => `${BASE}/${encodeURIComponent(intakeId)}`;

export const startIntake = (body: { conversationId: string; origin?: 'orders' | 'manual' }, locale?: string, signal?: AbortSignal) =>
  call<StartResponse>(BASE, { method: 'POST', body, locale, signal });

/** R1b — never creates a load: opening an old chat writes nothing. */
export const findOpenIntake = (conversationId: string, locale?: string, signal?: AbortSignal) =>
  call<OpenResponse>(`${BASE}?conversationId=${encodeURIComponent(conversationId)}`, { method: 'GET', locale, signal });

export const findUnfinishedIntake = (locale?: string, signal?: AbortSignal) =>
  call<UnfinishedResponse>(`${BASE}/unfinished`, { method: 'GET', locale, signal });

export const getIntake = (intakeId: string, locale?: string, signal?: AbortSignal) =>
  call<GetResponse>(id(intakeId), { method: 'GET', locale, signal });

export const postAnswer = (intakeId: string, body: AnswerRequest, locale?: string, signal?: AbortSignal) =>
  call<AnswerResponse>(`${id(intakeId)}/answer`, { method: 'POST', body, locale, signal });

export const finishIntake = (intakeId: string, body: FinishRequest, locale?: string, signal?: AbortSignal) =>
  call<FinishResponse>(`${id(intakeId)}/finish`, { method: 'POST', body, locale, signal });

export const undoIntake = (intakeId: string, body: { runId: string; rev: number }, locale?: string, signal?: AbortSignal) =>
  call<UndoResponse>(`${id(intakeId)}/undo`, { method: 'POST', body, locale, signal });

export const discardIntake = (intakeId: string, body: { rev: number }, locale?: string, signal?: AbortSignal) =>
  call<DiscardResponse>(`${id(intakeId)}/discard`, { method: 'POST', body, locale, signal });

/**
 * R4 — a page of a big list. Only the parameters §6.6 names are sent, and empty ones are left out.
 * A business failure is HTTP 200 `{ok:false}` like the other routes; a non-2xx throws (see `gatewayFailure`).
 */
export const OPTIONS_PAGE = 50; // §20.7: `limit` defaults to 50, max 100
export const OPTIONS_MAX = 100;
export function optionsPath(intakeId: string, kind: OptionsKind, query: OptionsQuery = {}): string {
  const params = new URLSearchParams();
  const put = (k: string, v: string | number | undefined | null) => { if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v)); };
  put('q', query.q?.trim()); put('group', query.group); put('cursor', query.cursor);
  put('limit', Math.min(query.limit ?? OPTIONS_PAGE, OPTIONS_MAX));
  put('role', query.role); put('directory', query.directory); put('stopKey', query.stopKey);
  const qs = params.toString();
  return `${id(intakeId)}/options/${kind}${qs ? `?${qs}` : ''}`;
}

export const getOptions = (intakeId: string, kind: OptionsKind, query: OptionsQuery | undefined, locale?: string, signal?: AbortSignal) =>
  call<OptionsResponse>(optionsPath(intakeId, kind, query), { method: 'GET', locale, signal });

/** The set of calls the page hook needs — injectable, so the hook's logic is testable with fixtures and no network. */
export interface IntakeApi {
  start: typeof startIntake;
  get: typeof getIntake;
  answer: typeof postAnswer;
  finish: typeof finishIntake;
  undo: typeof undoIntake;
  discard: typeof discardIntake;
  /** R4. Optional so an older injected API (a test double) still satisfies the interface; the widgets degrade to their candidates. */
  options?: typeof getOptions;
  /** R1b. Optional for the same reason: without it a reopened chat simply stays the text transcript. */
  open?: typeof findOpenIntake;
}
export const intakeApi: IntakeApi = {
  start: startIntake, get: getIntake, answer: postAnswer, finish: finishIntake, undo: undoIntake, discard: discardIntake, options: getOptions,
  open: findOpenIntake,
};

/** A non-2xx from these routes as one sentence — see `noticeOfThrown` (403 = the gateway's own paused copy, verbatim). */
export function gatewayFailure(err: unknown, unavailable: string): { text: string; paused: boolean } {
  const { notice, paused } = noticeOfThrown(err, unavailable);
  return { text: notice.text, paused };
}
