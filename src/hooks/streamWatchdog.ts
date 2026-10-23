/**
 * A watchdog for the streamed /chat and confirm requests.
 *
 * QA retest #3 (2026-10-10): the gateway process died mid-turn, the dev proxy
 * logged ECONNRESET and left the browser's request open, and the shipper watched
 * "Working with your MYVAGON data…" for over three minutes with no way out. A
 * fetch has no timeout of its own.
 *
 * Two limits, neither of which a healthy turn comes near:
 *   - CHAT_RESPONSE_TIMEOUT_MS (45 s) for the response to start. The gateway
 *     opens the stream right after its budget check, before any model or core
 *     API work, so a healthy one answers in well under a second.
 *   - CHAT_IDLE_TIMEOUT_MS (120 s) of SILENCE once it has started. While a turn
 *     works, the gateway sends a progress line every 2.5 s (and a batch sends one
 *     per draft), so two minutes with no byte at all means it is gone - while a
 *     long batch that keeps talking is never cut off, however long it runs.
 * There is deliberately no cap on total duration, so long batch flows are safe.
 */

export const CHAT_RESPONSE_TIMEOUT_MS = 45_000;
export const CHAT_IDLE_TIMEOUT_MS = 120_000;

export class GatewayStalledError extends Error {
  constructor() {
    super('Vagon AI stopped responding.');
    this.name = 'GatewayStalledError';
  }
}

export interface StreamWatchdog {
  /** Something arrived: restart the silence clock. */
  kick: () => void;
  /** The request finished one way or another. */
  stop: () => void;
  /** True once the watchdog aborted the request. */
  readonly stalled: boolean;
}

export function createStreamWatchdog(
  controller: AbortController,
  { responseMs = CHAT_RESPONSE_TIMEOUT_MS, idleMs = CHAT_IDLE_TIMEOUT_MS }: { responseMs?: number; idleMs?: number } = {},
): StreamWatchdog {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stalled = false;
  let stopped = false;

  const clear = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const arm = (ms: number) => {
    clear();
    timer = setTimeout(() => {
      if (stopped) return;
      stalled = true;
      controller.abort(new GatewayStalledError());
    }, ms);
  };

  arm(responseMs);
  return {
    kick: () => {
      if (!stopped && !stalled) arm(idleMs);
    },
    stop: () => {
      stopped = true;
      clear();
    },
    get stalled() {
      return stalled;
    },
  };
}
