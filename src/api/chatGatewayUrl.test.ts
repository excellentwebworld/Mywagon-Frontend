import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoredToken } from './client';
import { GatewayError, gatewayFetch, normalizeLocale } from './chatGatewayUrl';

// `client.ts` builds a real axios instance and touches localStorage at module
// load. None of that is under test here; we only assert `clearStoredToken` is NOT called on gateway 401.
vi.mock('./client', () => ({ clearStoredToken: vi.fn() }));

/**
 * `gatewayFetch`'s content-type guard.
 *
 * The guard exists for a dev-only failure that is genuinely hard to trace: a
 * gateway path missing from vite.config.ts's proxy table does not 404, it falls
 * through to the SPA's own index.html with a 200. `response.ok` is true, so
 * without this check the only symptom is `response.json()` dying on
 * `<!doctype html>` in some caller's catch, far from the cause.
 *
 * The trap it sets, and the reason these tests exist: gateway routes answer
 * *two* content types, not one. Most answer JSON, but POST /chat and
 * POST /chat/tool-calls/:id/confirm stream `text/event-stream` for `readFrames`
 * to consume. A guard written as "JSON or bust" rejects a perfectly healthy
 * turn before its body is read, and — because the message names vite.config.ts —
 * sends the next reader to a proxy table that was never wrong.
 *
 * So both directions are asserted deliberately: a stream must pass through with
 * its body intact, and HTML must still be caught.
 */

const originalFetch = globalThis.fetch;

function respondWith(contentType: string | null, body = '{}'): void {
  globalThis.fetch = vi.fn(async () =>
    contentType == null
      // A header-less response cannot be built by passing `headers: {}` with a
      // string body: the Response constructor then infers
      // `text/plain;charset=UTF-8`. Only a null body leaves it truly absent.
      ? new Response(null, { status: 200 })
      : new Response(body, { status: 200, headers: { 'content-type': contentType } }),
  ) as typeof globalThis.fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('gatewayFetch content-type guard', () => {
  it('passes an SSE stream through with its body readable', async () => {
    // The regression this covers: the streaming turn is the product's main
    // path, and rejecting it here breaks chat entirely while pointing the blame
    // at the proxy config.
    respondWith('text/event-stream', 'event: token\ndata: {"text":"hi"}\n\n');

    const response = await gatewayFetch('/chat', { token: 't' });

    expect(response.status).toBe(200);
    // Body must be untouched — `readFrames` reads it after this returns, so a
    // guard that consumed it would be as broken as one that threw.
    await expect(response.text()).resolves.toContain('event: token');
  });

  it('passes the confirm stream through', async () => {
    respondWith('text/event-stream');
    await expect(
      gatewayFetch('/chat/tool-calls/abc/confirm', { token: 't', method: 'POST' }),
    ).resolves.toMatchObject({ status: 200 });
  });

  it('accepts a charset-suffixed stream content type', async () => {
    // Gateways and proxies are both free to append parameters, so the check
    // cannot be an equality test against the bare type.
    respondWith('text/event-stream; charset=utf-8');
    await expect(gatewayFetch('/chat', { token: 't' })).resolves.toMatchObject({ status: 200 });
  });

  it('passes JSON through', async () => {
    respondWith('application/json', '{"userId":"u1"}');
    const response = await gatewayFetch('/me', { token: 't' });
    await expect(response.json()).resolves.toEqual({ userId: 'u1' });
  });

  it('rejects the SPA index.html fallback as a 502', async () => {
    // The case the guard was built for: an unproxied path answering 200 HTML.
    respondWith('text/html', '<!doctype html><html></html>');

    const error = await gatewayFetch('/scheduled-posts', { token: 't' }).catch((e) => e);

    expect(error).toBeInstanceOf(GatewayError);
    expect(error.status).toBe(502);
    // The message has to name both the path and vite.config.ts — that pairing
    // is the whole diagnostic value of the throw.
    expect(error.message).toContain('/scheduled-posts');
    expect(error.message).toContain('vite.config.ts');
  });

  it('rejects a response with no content type', async () => {
    respondWith(null, '');
    const error = await gatewayFetch('/me', { token: 't' }).catch((e) => e);
    expect(error).toBeInstanceOf(GatewayError);
    expect(error.message).toContain('no content type');
  });
});

describe('gatewayFetch auth', () => {
  it('throws a 401 without calling fetch when there is no token', async () => {
    respondWith('application/json');

    const error = await gatewayFetch('/me', { token: null }).catch((e) => e);

    expect(error).toBeInstanceOf(GatewayError);
    expect(error.isUnauthorized).toBe(true);
    // No session to clear and nothing to ask, so the request must not go out.
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the token verbatim and carries locale + timezone', async () => {
    respondWith('application/json');

    // `{id}|{random}` Sanctum tokens contain a pipe; splitting or trimming one
    // silently breaks auth, so assert the exact string arrives.
    await gatewayFetch('/me', { token: '42|abc.def', locale: 'el' });

    const headers = new Headers((vi.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).headers);
    expect(headers.get('authorization')).toBe('Bearer 42|abc.def');
    expect(headers.get('x-locale')).toBe('el');
    // Omitting this does not error — the gateway falls back to Europe/Athens and
    // the shipper's time windows shift by hours, which is why it is asserted.
    expect(headers.get('x-client-timezone')).toBeTruthy();
  });


  it('does not clear the shipper session on a gateway 401', async () => {
    // Gateway auth is a separate service — a 401 here must never dump the
    // shipper to /login mid create-shipment flow. Real logout stays on axios
    // main-API 401 / shipper:force-logout.
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    ) as typeof globalThis.fetch;

    const error = await gatewayFetch('/chat', { token: '42|abc' }).catch((e) => e);
    expect(error).toBeInstanceOf(GatewayError);
    expect(error.isUnauthorized).toBe(true);
    // Only one fetch: the gateway call itself. No /auth/me (or /me/) probe.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(clearStoredToken).not.toHaveBeenCalled();
  });

  it('still surfaces isUnauthorized without dispatching unauthorized', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    ) as typeof globalThis.fetch;

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    await gatewayFetch('/me', { token: '42|abc' }).catch(() => null);
    expect(clearStoredToken).not.toHaveBeenCalled();
    expect(
      dispatchSpy.mock.calls.some(
        (call) => call[0] instanceof CustomEvent && call[0].type === 'shipper:unauthorized',
      ),
    ).toBe(false);
    dispatchSpy.mockRestore();
  });

  it('distinguishes a 503 from a 401 so a blip cannot sign the shipper out', () => {
    expect(new GatewayError('x', 503).isUnavailable).toBe(true);
    expect(new GatewayError('x', 503).isUnauthorized).toBe(false);
  });
});

describe('normalizeLocale', () => {
  it('keeps el and falls back to en for anything else', () => {
    expect(normalizeLocale('el')).toBe('el');
    expect(normalizeLocale('en')).toBe('en');
    // An unrecognized UI language must not be forwarded as-is — the gateway
    // replies in whatever it is sent.
    expect(normalizeLocale('fr')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });
});
