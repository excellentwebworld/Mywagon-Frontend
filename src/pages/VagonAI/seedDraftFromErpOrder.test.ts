import { describe, expect, it } from 'vitest';
import {
  buildEnrichedDraftPrompt,
  buildErpDraftSeedFromOrder,
} from './seedDraftFromErpOrder';

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
});
