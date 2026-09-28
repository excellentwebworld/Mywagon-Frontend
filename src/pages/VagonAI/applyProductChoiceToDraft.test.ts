import { describe, expect, it } from 'vitest';
import type { FlowDraftSeed } from '../../hooks/useChat';
import {
  applyProductChoiceToDraft,
  parseProductOptionId,
} from './applyProductChoiceToDraft';

const emptySeed = (): FlowDraftSeed => ({
  customerReference: null,
  stops: [
    { locationId: '', locationName: null, from: '', to: null, lines: [] },
    { locationId: '', locationName: null, from: '', to: null, lines: [] },
  ],
  vehicleTypeIds: [],
  vehicleCategoryIds: [],
  broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
  pricing: {
    negotiable: true,
    startingPrice: null,
    negotiableFloor: null,
    currency: 'EUR',
  },
  requireTracking: false,
  responseWindow: '48h',
  settlement: 'direct',
  bulk: { mode: 'single' },
  trackingOrderIds: [],
});

describe('parseProductOptionId', () => {
  it('parses product:97 and bare digits', () => {
    expect(parseProductOptionId('product:97')).toBe('97');
    expect(parseProductOptionId('97')).toBe('97');
    expect(parseProductOptionId('location:1')).toBeNull();
    expect(parseProductOptionId('new_product')).toBeNull();
  });
});

describe('applyProductChoiceToDraft', () => {
  it('writes pick+drop lines with cargo so Save can enable', () => {
    const now = new Date('2026-09-21T12:00:00');
    let draft = emptySeed();
    draft = {
      ...draft,
      stops: [
        { locationId: '10', locationName: 'A', from: '', to: null, lines: [] },
        { locationId: '20', locationName: 'B', from: '', to: null, lines: [] },
      ],
    };
    draft = applyProductChoiceToDraft(
      draft,
      '97',
      'Olive oil',
      { qty: 12, unit: 'EUR_PALLET', weight: 240, weight_unit: 'KG' },
      now,
    );
    const pick = draft.stops[0]!.lines.find((l) => l.action === 'pick');
    const drop = draft.stops[1]!.lines.find((l) => l.action === 'drop');
    expect(pick?.productId).toBe('97');
    expect(pick?.productName).toBe('Olive oil');
    expect(pick?.qty).toBe(12);
    expect(pick?.weight).toBe(240);
    expect(pick?.unit).toBe('EUR_PALLET');
    expect(drop?.productId).toBe('97');
    expect(drop?.qty).toBe(12);
    expect(draft.stops[0]!.from.length).toBeGreaterThan(0);
    expect(draft.stops[1]!.from.length).toBeGreaterThan(0);
  });

  it('fills an empty placeholder line instead of duplicating', () => {
    const now = new Date('2026-09-21T12:00:00');
    let draft = emptySeed();
    draft.stops[0]!.lines = [{
      productId: '',
      productName: null,
      action: 'pick',
      qty: 0,
      unit: 'UNIT',
      weight: 0,
      wUnit: 'KG',
      sourceUnit: null,
      orderId: null,
      orderLineId: null,
      customerId: null,
    }];
    draft = applyProductChoiceToDraft(
      draft,
      '5',
      'Peas',
      { qty: 1, unit: 'UNIT', weight: 10, weight_unit: 'KG' },
      now,
    );
    expect(draft.stops[0]!.lines.filter((l) => l.action === 'pick')).toHaveLength(1);
    expect(draft.stops[0]!.lines[0]!.productId).toBe('5');
  });
});
