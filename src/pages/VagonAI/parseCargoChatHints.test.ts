import { describe, expect, it } from 'vitest';
import {
  applyCargoHintsToDraft,
  parseCargoHintsFromMessage,
} from './parseCargoChatHints';
import type { ShipmentDraft } from './createShipmentDraft';

function draftWithGap(): ShipmentDraft {
  return {
    customerReference: null,
    stops: [
      {
        locationId: '1841',
        from: '2030-09-14T08:00',
        to: null,
        lines: [{
          productId: '97',
          action: 'pick',
          qty: 0,
          unit: 'EUR_PALLET',
          weight: 0,
          wUnit: 'KG',
          orderId: '1042',
          orderLineId: '5511',
          customerId: '31',
        }],
      },
      {
        locationId: '1842',
        from: '2030-09-16T08:00',
        to: null,
        lines: [{
          productId: '97',
          action: 'drop',
          qty: 0,
          unit: 'EUR_PALLET',
          weight: 0,
          wUnit: 'KG',
          orderId: '1042',
          orderLineId: '5511',
          customerId: '31',
        }],
      },
    ],
    vehicleTypeIds: [],
    vehicleCategoryIds: [],
    broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
    pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
    requireTracking: false,
    responseWindow: '48h',
    settlement: 'direct',
    bulk: { mode: 'single' },
    trackingOrderIds: [],
  };
}

describe('parseCargoHintsFromMessage', () => {
  it('parses qty + EUR pallets and kg weight from the QA repro message', () => {
    const hints = parseCargoHintsFromMessage(
      'Drill matchine weighs 250 kg and we are shipping 2 EUR pallets',
    );
    expect(hints).toEqual({ qty: 2, unit: 'EUR_PALLET', weight: 250, wUnit: 'KG' });
  });

  it('parses bare pallets and tonnes', () => {
    expect(parseCargoHintsFromMessage('12 pallets, 8 tonnes')).toEqual({
      qty: 12,
      unit: 'EUR_PALLET',
      weight: 8,
      wUnit: 'T',
    });
  });

  it('returns null when nothing cargo-like is present', () => {
    expect(parseCargoHintsFromMessage('please proceed')).toBeNull();
  });
});

describe('applyCargoHintsToDraft', () => {
  it('fills the first pick gap and mirrors the drop', () => {
    const patched = applyCargoHintsToDraft(draftWithGap(), {
      qty: 2,
      unit: 'EUR_PALLET',
      weight: 250,
      wUnit: 'KG',
    });
    expect(patched.stops[0]!.lines[0]!.qty).toBe(2);
    expect(patched.stops[0]!.lines[0]!.weight).toBe(250);
    expect(patched.stops[1]!.lines[0]!.qty).toBe(2);
    expect(patched.stops[1]!.lines[0]!.weight).toBe(250);
  });

  it('does not overwrite a qty the shipper already set', () => {
    const current = draftWithGap();
    current.stops[0]!.lines[0]!.qty = 5;
    current.stops[1]!.lines[0]!.qty = 5;
    const patched = applyCargoHintsToDraft(current, { qty: 2, unit: 'EUR_PALLET', weight: 250, wUnit: 'KG' });
    expect(patched.stops[0]!.lines[0]!.qty).toBe(5);
    expect(patched.stops[0]!.lines[0]!.weight).toBe(250);
  });
});
