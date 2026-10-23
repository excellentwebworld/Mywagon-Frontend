import { describe, expect, it } from 'vitest';
import {
  applyErpSeedToFlowDraft,
  buildEnrichedDraftPrompt,
  buildErpDraftSeedFromOrder,
  matchLocationByName,
  pickSeedForDraft,
} from './seedDraftFromErpOrder';
import { buildStickyCreateForceTool, type StickyOrderRow } from './StickyOrdersPanel';

describe('seedDraftFromErpOrder', () => {
  it('uses origin/dest location ids from the order', () => {
    const seed = buildErpDraftSeedFromOrder({
      id: '91',
      orderReference: 'ORD-A',
      originLocationId: 1841,
      destLocationId: 1842,
      shipFrom: 'Greece',
      shipTo: 'WC1',
    });
    expect(seed.pickup?.locationId).toBe('1841');
    expect(seed.delivery?.locationId).toBe('1842');
  });

  it('enriched prompt names location ids', () => {
    const text = buildEnrichedDraftPrompt([
      {
        orderId: '91',
        orderReference: 'ORD-A',
        shipFrom: 'Greece',
        shipTo: 'WC1',
        pickup: { locationId: '1841', locationName: 'Greece' },
        delivery: { locationId: '1842', locationName: 'WC1' },
      },
    ]);
    expect(text).toContain('ORD-A');
    expect(text).toContain('1841');
    expect(text).toContain('1842');
    expect(text.toLowerCase()).toContain('one-shot');
  });

  // SEC-09: the gateway honours only `forceTool`, never the marker in the text.
  // The page sends this prompt together with `buildStickyCreateForceTool(orders)`
  // (VagonAIPage handleStickyCreateDrafts), so the single-seed request must carry
  // the forced one-shot tool for the very order the text names, id as a string.
  it('single seed goes out with forceTool create_oneshot_draft_from_order for that order', () => {
    const order = { id: 91 as unknown as string, orderReference: 'ORD-A', shipFrom: 'Greece', shipTo: 'WC1', originLocationId: 1841, destLocationId: 1842 };
    const seed = buildErpDraftSeedFromOrder(order);
    const text = buildEnrichedDraftPrompt([seed]);
    const opts = buildStickyCreateForceTool([{ id: order.id } as StickyOrderRow]);
    expect(opts.run_kind).toBeUndefined();
    expect(opts.forceTool).toEqual({ name: 'create_oneshot_draft_from_order', arguments: { order_id: '91' } });
    expect(text).toContain(`order id ${opts.forceTool.arguments.order_id}`);
  });
});

describe('MS3-413 - an order site named only in words', () => {
  const book = [
    { id: '342', name: 'W1', city: 'Elefsina', code: '', role: 'both' },
    { id: '343', name: 'W2', city: 'Elefsina', code: '', role: 'both' },
    { id: '9', name: 'Athens Depot', city: 'Athens', code: '', role: 'pickup' },
  ] as never[];
  it('a site named exactly is that site', () => {
    expect(matchLocationByName('W1', book, 'pickup')).toMatchObject({ id: '342' });
  });
  it('two sites that fit equally are a question, not a silent pick', () => {
    expect(matchLocationByName('Elefsina', book, 'pickup')).toBeNull();
    const seed = buildErpDraftSeedFromOrder({ id: '1', orderReference: 'A', originLocationId: null as never, destLocationId: null as never, shipFrom: 'Elefsina', shipTo: '' }, book);
    expect(seed.pickup).toBeUndefined();
  });
});

describe('pickSeedForDraft / applyErpSeedToFlowDraft — another order never leaks onto the card (QA retest #2)', () => {
  const seedOrd1 = {
    orderId: '337', orderReference: 'QARET-1010-ORD1', shipFrom: 'A', shipTo: 'Sindos',
    pickup: { locationId: '916', locationName: 'Chat Site A' },
    delivery: { locationId: '853', locationName: 'Sindos Industrial Warehouse' },
  };
  const seedOrd2 = { ...seedOrd1, orderId: '338', orderReference: 'QARET-1010-ORD2', delivery: { locationId: '1115', locationName: 'QARET-1010 New Depot' } };
  const line = (orderId: string | null) => ({
    productId: '', productName: 'QARET-1010 Widget Large', action: 'pick' as const, qty: 5, unit: 'UNIT' as const,
    weight: 40, wUnit: 'KG' as const, sourceUnit: null, orderId, orderLineId: null, customerId: null,
  });
  const draftFor = (orderId: string | null, deliveryId = '1115', ref: string | null = null) => ({
    customerReference: ref,
    stops: [
      { locationId: '', locationName: null, from: '2026-10-11T09:00', to: null, lines: [line(orderId)] },
      { locationId: deliveryId, locationName: 'QARET-1010 New Depot', from: '2026-10-24T08:00', to: null, lines: [{ ...line(orderId), action: 'drop' as const }] },
    ],
    vehicleTypeIds: [], vehicleCategoryIds: [],
    broadcast: { channels: [], carrierPartnerIds: [], driverId: null },
    pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    requireTracking: false, responseWindow: '', settlement: '', bulk: { mode: '' }, trackingOrderIds: [],
  });

  it('does not fall back to the first seed for a draft of a different order (ORD5 vs held ORD1/ORD2 seeds)', () => {
    expect(pickSeedForDraft([seedOrd1, seedOrd2], draftFor('341'))).toBeNull();
    expect(pickSeedForDraft([seedOrd1], draftFor(null))).toBeNull();
    expect(pickSeedForDraft([seedOrd1], draftFor(null, '1115', 'QARET2-1010-ORD5'))).toBeNull();
  });

  it('picks the seed of the order actually on the draft', () => {
    expect(pickSeedForDraft([seedOrd1, seedOrd2], draftFor('338'))?.orderReference).toBe('QARET-1010-ORD2');
    expect(pickSeedForDraft([seedOrd1], draftFor(null, '', 'qaret-1010-ord1'))?.orderId).toBe('337');
  });

  it('only fills a blank site - never replaces the delivery the gateway set from the order', () => {
    const patched = applyErpSeedToFlowDraft(draftFor('337', '1115'), seedOrd1, new Date('2026-10-10T10:00:00Z'));
    expect(patched.stops[1]!.locationId).toBe('1115');
    expect(patched.stops[0]!.locationId).toBe('916');
    const gap = applyErpSeedToFlowDraft(draftFor('337', ''), seedOrd1, new Date('2026-10-10T10:00:00Z'));
    expect(gap.stops[1]!.locationId).toBe('853');
  });
});
