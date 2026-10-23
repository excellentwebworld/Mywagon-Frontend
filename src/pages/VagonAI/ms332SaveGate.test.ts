import { describe, expect, it } from 'vitest';
import { draftFromSeed, describeSaveBlockers, saveIssues } from './createShipmentDraft';

describe('MS3-332 from-order save gate', () => {
  it('bumps past ERP stop times so Save is not blocked when cargo+sites exist', () => {
    const bundle = {
      draft: {
        customerReference: 'QA-ORD-20260914181234',
        stops: [
          {
            locationId: '10',
            locationName: 'Test Location Greece',
            from: '2020-01-01T08:00',
            to: null,
            lines: [
              {
                productId: '97',
                productName: 'QA E2E Peas',
                action: 'pick',
                qty: 10,
                unit: 'UNIT',
                weight: 100,
                wUnit: 'KG',
                sourceUnit: null,
                orderId: '78',
                orderLineId: null,
                customerId: null,
              },
            ],
          },
          {
            locationId: '20',
            locationName: 'WC1',
            from: '2020-01-02T17:00',
            to: null,
            lines: [
              {
                productId: '97',
                productName: 'QA E2E Peas',
                action: 'drop',
                qty: 10,
                unit: 'UNIT',
                weight: 100,
                wUnit: 'KG',
                sourceUnit: null,
                orderId: '78',
                orderLineId: null,
                customerId: null,
              },
            ],
          },
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
      },
      gaps: [],
      suggestions: { vehicle: null, partner: null, partnerAlternatives: [] },
      orders: [],
      locations: [],
      products: [],
      partners: [],
      vehicleTypes: [],
      defaults: {
        responseWindow: '48h',
        settlement: 'direct',
        requireTracking: false,
        negotiable: true,
        currency: 'EUR',
        bulkMode: 'single',
      },
      rules: {},
      notes: [],
      truncated: {},
    } as any;

    const draft = draftFromSeed(bundle);
    expect(draft.stops[0]!.from.startsWith('2020')).toBe(false);
    const fields = describeSaveBlockers(draft).map((b) => b.field);
    expect(fields).not.toContain('stops[0].from');
    expect(fields).not.toContain('stops[1].from');
    expect(saveIssues(draft)).toEqual([]);
  });
});
