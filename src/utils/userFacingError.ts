/**
 * Aborts and timeouts, in words a shipper can read.
 *
 * QA retest #2 (2026-10-10): "The operation was aborted due to timeout" - the
 * browser's (or Node's) own DOMException text - reached the chat. Every place an
 * error message is shown to the shipper passes it through here.
 */

const ABORT_OR_TIMEOUT =
  /operation was aborted|aborted due to timeout|signal is aborted|\btimeouterror\b|\baborterror\b|\betimedout\b|\bsocket hang up\b|\brequest timed out\b|\btimed out\b|\btimeout\b/i;

/** True for abort/timeout wording, or an Error named TimeoutError/AbortError. */
export function isAbortOrTimeout(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) return true;
  const text = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return ABORT_OR_TIMEOUT.test(text);
}

/**
 * The browser's ways of saying the connection itself failed (QA retest #3:
 * "Something went wrong: Failed to fetch"): Chrome "Failed to fetch", Firefox
 * "NetworkError when attempting to fetch resource", Safari "Load failed", plus
 * resets and refusals a dev proxy or gateway passes on, and the watchdog's stall.
 */
const NETWORK =
  /failed to fetch|networkerror|network ?error|load failed|network request failed|err_network|err_connection|econnreset|econnrefused|socket hang up|connection (?:was )?(?:reset|refused|closed|lost)|stopped responding|bad gateway|service unavailable|\b50[23]\b/i;

/** True for a lost/refused connection or a gateway that stopped responding. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof Error && err.name === 'GatewayStalledError') return true;
  const text = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return NETWORK.test(text);
}

type Translate = (key: string, fallback?: string) => string;

/** The localized "the connection broke" sentence. */
export function networkMessage(t: Translate): string {
  return t('vagonai.live.network', 'The connection to Vagon AI was interrupted before the reply arrived. Please try again.');
}

/** The localized "the gateway went quiet" sentence (the stream watchdog fired). */
export function stalledMessage(t: Translate): string {
  return t('vagonai.live.stalled', 'Vagon AI stopped responding, so this request was stopped. Please check whether anything was created before trying again.');
}

/** True when the error is worth a Retry button: the request may simply not have arrived. */
export function isRetryableError(err: unknown): boolean {
  return isNetworkError(err) || isAbortOrTimeout(err);
}

/**
 * A failed action's summary from the gateway, if - and only if - it reads as
 * written for the shipper. Tool output is written for the model; QA retest #3
 * showed one ("(For the assistant: if you quote this…)") as a red banner. The
 * gateway now strips these too; this is the client's own line of defence.
 */
const MODEL_FACING =
  /\((?:note )?for the assistant\b|\btell the shipper\b|\bthe shipper (?:can|should|must|is|has|needs)\b|\bdo not (?:quote|retry|mention|tell)\b|\bnever (?:mention|quote|tell)\b|\bthis was your mistake\b|\bMCP error\b|\bInput validation error\b|\bSQLSTATE\b|\bcall [a-z_]+ again\b/i;

export function shipperSafeSummary(summary: unknown): string | null {
  if (typeof summary !== 'string') return null;
  const text = summary.trim();
  if (!text || MODEL_FACING.test(text)) return null;
  return text;
}

/** The localized timeout sentence. */
export function timeoutMessage(t: Translate): string {
  return t('vagonai.live.timeout', 'That took too long to answer, so it was stopped - nothing was changed. Please try again in a moment.');
}

/**
 * The text to show for `err`: the friendly timeout sentence for an abort or a
 * timeout, the error's own message otherwise, `fallback` when it has none.
 */
/**
 * The failures the chat names in its own words. Kept as a kind rather than a
 * sentence so the page words it with ITS current translator (QA retest #4: the
 * Greek UI showed these in English - the hook had captured an English `t`).
 */
export type ChatErrorKind = 'network' | 'stalled' | 'timeout';

export function errorKindOf(err: unknown): ChatErrorKind | null {
  if (err instanceof Error && err.name === 'GatewayStalledError') return 'stalled';
  // A timeout first: "took too long" is the truer sentence for a 504 or an abort.
  if (isAbortOrTimeout(err)) return 'timeout';
  if (isNetworkError(err)) return 'network';
  return null;
}

export function messageForErrorKind(kind: ChatErrorKind, t: Translate): string {
  if (kind === 'stalled') return stalledMessage(t);
  if (kind === 'timeout') return timeoutMessage(t);
  return networkMessage(t);
}

export function userFacingError(err: unknown, t: Translate, fallback: string): string {
  const kind = errorKindOf(err);
  if (kind) return messageForErrorKind(kind, t);
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}
