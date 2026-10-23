import { describe, expect, it } from 'vitest';
import {
  seedTrackingEmails,
  setTrackingEmailsForOrder,
  syncTrackingEmailFromOrder,
  type ShipmentDraft,
} from './createShipmentDraft';
import type { FlowBundle } from '../../hooks/useChat';

const emptyDraft = (): ShipmentDraft => ({
  customerReference: null,
  stops: [],
  vehicleTypeIds: [],
  vehicleCategoryIds: [],
  broadcast: { channels: ['private'], carrierPartnerIds: [], driverId: null },
  pricing: { negotiable: true, startingPrice: null, negotiableFloor: null, currency: 'EUR' },
  requireTracking: false,
  responseWindow: '48h',
  settlement: 'direct',
  bulk: { mode: 'single' },
  trackingOrderIds: [],
  trackingEmails: {},
});

describe('trackingEmails helpers (MS3-354)', () => {
  const bundle = {
    orders: [
      { orderId: '10', reference: 'ORD-1', customerName: 'Acme', customerId: 'c1', deliveryDate: '', trackingEmail: 'recv@acme.test' },
      { orderId: '11', reference: 'ORD-2', customerName: 'Beta', customerId: 'c2', deliveryDate: '', trackingEmail: null },
    ],
  } as unknown as FlowBundle;

  it('seeds emails from order.trackingEmail', () => {
    expect(seedTrackingEmails(bundle)).toEqual({ '10': ['recv@acme.test'] });
  });

  it('setTrackingEmailsForOrder toggles trackingOrderIds with non-empty email', () => {
    let d = emptyDraft();
    d = setTrackingEmailsForOrder(d, '10', ['a@x.com', 'b@x.com']);
    expect(d.trackingOrderIds).toContain('10');
    expect(d.trackingEmails['10']).toEqual(['a@x.com', 'b@x.com']);
    d = setTrackingEmailsForOrder(d, '10', ['', '']);
    expect(d.trackingOrderIds).not.toContain('10');
  });

  it('syncTrackingEmailFromOrder restores first email from order', () => {
    let d = setTrackingEmailsForOrder(emptyDraft(), '10', ['stale@x.com']);
    d = syncTrackingEmailFromOrder(d, bundle, '10');
    expect(d.trackingEmails['10']![0]).toBe('recv@acme.test');
  });
});
