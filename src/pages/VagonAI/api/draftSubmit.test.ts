import { afterEach, describe, expect, it, vi } from 'vitest';
import { GatewayError } from '../../../api/chatGatewayUrl';
import {
  draftSubmitErrorReason,
  ensureDraftRunId,
  isUnknownOutcome,
  newDraftRunId,
  submitShipmentDraft,
} from './shipmentDraftService';
import { submitOrderDraft } from './orderDraftService';
import { submitProductDraft } from './productDraftService';
import { submitLocationDraft } from './locationDraftService';
import type { ShipmentDraft } from '../createShipmentDraft';
import type { ProductDraft } from '../createProductDraft';

// `client.ts` builds an axios instance and touches localStorage at load; only the token is needed.
vi.mock('../../../api/client', () => ({ getStoredToken: () => 'tok' }));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const originalFetch = globalThis.fetch;

function respond(status: number, body: unknown) {
  const fn = vi.fn(async (_url: unknown, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
  globalThis.fetch = fn as unknown as typeof globalThis.fetch;
  return fn;
}

const sentBody = (fn: ReturnType<typeof respond>) => JSON.parse(String(fn.mock.calls[0]![1]!.body));

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('BL-04 run_id on the draft endpoints', () => {
  it('mints a v4 uuid once per card and reuses it on every retry', () => {
    expect(newDraftRunId()).toMatch(UUID);
    const ref = { current: null as string | null };
    const first = ensureDraftRunId(ref);
    expect(first).toMatch(UUID);
    expect(ensureDraftRunId(ref)).toBe(first);
    expect(ensureDraftRunId({ current: null })).not.toBe(first);
  });

  it('sends run_id to /chat/shipment-draft, and omits it when none is given', async () => {
    const ok = { ok: true, outcome: 'draft', draft_id: 1, auto_id: 'SID-1', url: '/x', warnings: [], unsupported: [] };
    let fn = respond(200, ok);
    await submitShipmentDraft({ conversationId: 'c', intent: 'publish', draft: {} as ShipmentDraft, runId: 'r-1' });
    expect(String(fn.mock.calls[0]![0])).toContain('/chat/shipment-draft');
    expect(sentBody(fn).run_id).toBe('r-1');
    fn = respond(200, ok);
    await submitShipmentDraft({ conversationId: 'c', intent: 'save_draft', draft: {} as ShipmentDraft });
    expect('run_id' in sentBody(fn)).toBe(false);
  });

  it('sends run_id to the order, product and location endpoints', async () => {
    let fn = respond(200, { ok: false, missing: [], reason: 'x' });
    await submitOrderDraft({ conversationId: 'c', draft: {}, runId: 'r-o' });
    expect(String(fn.mock.calls[0]![0])).toContain('/chat/order-draft');
    expect(sentBody(fn)).toMatchObject({ conversationId: 'c', draft: {}, run_id: 'r-o' });
    fn = respond(200, { ok: false, missing: [], reason: 'x' });
    await submitProductDraft({ conversationId: 'c', draft: {} as ProductDraft, runId: 'r-p' });
    expect(String(fn.mock.calls[0]![0])).toContain('/chat/product-draft');
    expect(sentBody(fn).run_id).toBe('r-p');
    fn = respond(200, { ok: false, missing: [], reason: 'x' });
    await submitLocationDraft({ conversationId: 'c', draft: {}, runId: 'r-l' });
    expect(String(fn.mock.calls[0]![0])).toContain('/chat/location-draft');
    expect(sentBody(fn).run_id).toBe('r-l');
  });
});

describe('BL-17 outcome "unknown"', () => {
  it('is recognised whatever `ok` says, and is not mistaken for a success', async () => {
    respond(200, { ok: true, outcome: 'unknown', message: 'Check Manage Shipments before retrying.' });
    const result = await submitShipmentDraft({ conversationId: 'c', intent: 'publish', draft: {} as ShipmentDraft, runId: 'r' });
    expect(isUnknownOutcome(result)).toBe(true);
    respond(200, { ok: true, outcome: 'published', draft_id: 1, auto_id: 'SID-1', url: '/x', warnings: [], unsupported: [] });
    const done = await submitShipmentDraft({ conversationId: 'c', intent: 'publish', draft: {} as ShipmentDraft, runId: 'r' });
    expect(isUnknownOutcome(done)).toBe(false);
  });
});

describe('409 already in progress', () => {
  const t = (key: string, fallback?: string) => fallback ?? key;

  it('surfaces the server sentence as-is', async () => {
    respond(409, { error: 'This load is already being saved.' });
    const err = await submitShipmentDraft({ conversationId: 'c', intent: 'publish', draft: {} as ShipmentDraft, runId: 'r' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect((err as GatewayError).status).toBe(409);
    expect(draftSubmitErrorReason(err, t)).toBe('This load is already being saved.');
  });

  it('is not re-worded as a timeout even when the sentence mentions one', () => {
    const err = new GatewayError('Still in progress - the earlier request has not timed out yet.', 409);
    expect(draftSubmitErrorReason(err, t)).toBe('Still in progress - the earlier request has not timed out yet.');
  });
});
