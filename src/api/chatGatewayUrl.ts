import { getBrowserTimezone } from '../utils/timezone';

/**
 * Resolves a path on the Vagon AI chat gateway (a separate service from the
 * Laravel API `axiosInstance` talks to — see `client.ts`).
 *
 * Dev: same-origin, proxied server-side by vite.config.ts to the gateway —
 * avoids the gateway's CORS_ORIGIN allowlist entirely, so it doesn't matter
 * whether the app is opened via localhost or a LAN IP.
 * Prod: call the gateway directly (needs its own CORS/reverse-proxy setup).
 */
export function gatewayUrl(path: string): string {
  if (import.meta.env.DEV) return path;
  const configured = import.meta.env.VITE_CHAT_GATEWAY_URL;
  if (!configured) {
    // Vite inlines this at build time, so an unset var bakes a dead URL into the
    // bundle. Falling back to localhost here would make every deployed call fail
    // as an opaque network/CORS error in the shipper's browser; a named error
    // surfaces the actual cause (a build made without the env var set) in the
    // console, while callers still degrade to the "temporarily unavailable" copy.
    throw new Error(
      'VITE_CHAT_GATEWAY_URL was not set when this bundle was built — the chat gateway is unreachable.',
    );
  }
  const base = configured.replace(/\/chat\/?$/, '');
  return `${base}${path}`;
}

/**
 * Normalizes the shipper's UI language (AppContext's `lang`) to the gateway's
 * supported X-Locale values. The gateway always replies in this language,
 * regardless of what language the shipper types in — so every request must
 * carry it, and an unrecognized value must fall back to 'en' rather than be
 * sent as-is.
 */
export function normalizeLocale(lang?: string | null): 'en' | 'el' {
  return lang === 'el' ? 'el' : 'en';
}

/**
 * A failed gateway call. `status` matters for session handling — see
 * `isUnauthorized` vs `isUnavailable`, which mean opposite things.
 */
export class GatewayError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
  }

  /** 401 — the gateway rejected the token. Local to chat; never clears the session. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * 503 — the gateway is up but couldn't reach its own auth backend, so it
   * can't say whether the token is valid. The token is probably fine, so this
   * must NOT end the session — surface it as a transient, retryable state.
   */
  get isUnavailable(): boolean {
    return this.status === 503;
  }
}

/**
 * Every gateway endpoint (all six: /chat, /me, /conversations,
 * /conversations/:id/messages, and the two deletes) authenticates with the
 * shipper's Laravel Sanctum token, forwarded verbatim — it is an opaque
 * `{id}|{random}` string, so never split, decode, or trim it.
 */
function authHeaders(token: string, locale?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'X-Locale': normalizeLocale(locale),
    // Shipment actions materialize pickup/delivery wall-clock times to UTC
    // against this zone. Omitting it does not error — the gateway falls back to
    // Europe/Athens and the shipper's time windows silently shift by hours.
    'X-Client-Timezone': getBrowserTimezone(),
  };
}

/**
 * Single entry point for gateway calls: attaches auth, and converts a failed
 * response into a `GatewayError` carrying the status the caller needs to tell
 * "logged out" apart from "briefly unreachable".
 *
 * A gateway 401 does NOT clear the shipper session. The chat gateway is a
 * separate service; its auth can fail while Laravel Sanctum is still fine, and
 * treating that as terminal mid-flow dumped shippers to /login. Callers surface
 * `GatewayError.isUnauthorized` as local chat UI (`checkGatewayAuth` / banner).
 * Real logout stays on axios main-API 401 and `shipper:force-logout`. A 503
 * still clears nothing — a blip must not sign anyone out.
 *
 * Returns the raw `Response` so streaming callers keep access to `body`.
 */

export async function gatewayFetch(
  path: string,
  { token, locale, ...init }: RequestInit & { token: string | null; locale?: string },
): Promise<Response> {
  if (!token) {
    // Not signed in at all — no session to clear, so don't fire the event.
    throw new GatewayError('Not authenticated.', 401);
  }

  const response = await fetch(gatewayUrl(path), {
    ...init,
    headers: { ...authHeaders(token, locale), ...init.headers },
  });

  if (!response.ok) {
    // Gateway 401 / 503: throw only. Never clearStoredToken or dispatch
    // shipper:unauthorized here — that belongs to the main shipper API path.
    const body = await response.json().catch(() => null);
    throw new GatewayError(
      body?.error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  // The call reached *something*, but not the gateway.
  //
  // In dev every gateway path is same-origin and forwarded by vite.config.ts's
  // proxy table. A path that is missing from that table does not 404 - it falls
  // through to the SPA's own index.html with a 200, so `response.ok` is true and
  // the only symptom is `response.json()` dying on `<!doctype html>` inside some
  // caller's catch, miles from the cause.
  //
  // A gateway route answers one of exactly two things, so anything else means
  // the request never arrived and the proxy entry (or the feature's env flag) is
  // what to look at:
  //
  //   - JSON, for every request/response route.
  //   - text/event-stream, for the two that stream: POST /chat and
  //     POST /chat/tool-calls/:id/confirm, both read by `readFrames`.
  //
  // The stream case must be allowed through explicitly. Checking for JSON alone
  // rejects a perfectly healthy turn before its body is ever read, and reports it
  // as a proxy fault — sending you to a vite.config.ts that was never wrong.
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json') && !contentType.includes('event-stream')) {
    throw new GatewayError(
      `The chat gateway did not answer ${path} — it returned ${contentType || 'no content type'}. ` +
        'In dev, check the proxy table in vite.config.ts covers this path, and that the gateway has the feature enabled.',
      502,
    );
  }

  return response;
}
