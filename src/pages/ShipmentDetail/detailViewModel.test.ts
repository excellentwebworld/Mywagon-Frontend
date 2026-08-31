import { describe, it, expect } from 'vitest';
import { buildShipmentDetailViewModel } from './detailViewModel';
import type { Shipment } from '../../context/AppContext';

const baseMockShipment: Shipment = {
  id: 'shp-123',
  autoId: 'SHP-1234',
  date: '18/02/2026',
  status: 'draft',
  vis: 'private',
  origin: 'Athens',
  dest: 'Thessaloniki',
  via: null,
  customer: [{ name: 'Alpha Foods Ltd', orders: ['ORD-1001'] }],
  bids: 0,
  best_bid: null,
  bid_exp: null,
  carrier: null,
  price: 410,
  price_type: 'contract',
  updated: '18/02/2026',
  timeline: [],
  tl_cur: 0,
};

describe('buildShipmentDetailViewModel', () => {
  it('builds view model for draft shipment', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'draft',
    });
    expect(vm.displayId).toBe('SHP-1234');
    expect(vm.status).toBe('draft');
    expect(vm.availableNavSections).toContain('stops');
    expect(vm.availableNavSections).toContain('load');
    expect(vm.availableNavSections).not.toContain('bids');
    expect(vm.availableNavSections).not.toContain('tracking');
    expect(vm.carrier).toBeNull();
  });

  it('builds view model for pending shipment with bids section', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'pending',
      offers: [{ id: 'off-1', type: 'bid', price: 400 }],
    });
    expect(vm.status).toBe('pending');
    expect(vm.availableNavSections).toContain('bids');
    expect(vm.invitedPartners.length).toBeGreaterThan(0);
  });

  it('builds view model for scheduled / ready shipment with carrier', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'scheduled',
      carrier: 'Transmed Logistics S.A.',
      carrierRating: 4.9,
    });
    expect(vm.status).toBe('scheduled');
    expect(vm.carrier).not.toBeNull();
    expect(vm.carrier?.name).toBe('Transmed Logistics S.A.');
    expect(vm.availableNavSections).toContain('carrier');
    expect(vm.availableNavSections).not.toContain('tracking');
  });

  it('builds view model for on_trip shipment with live tracking', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'on_trip',
      carrier: 'Transmed Logistics S.A.',
      at_risk: true,
    });
    expect(vm.status).toBe('on_trip');
    expect(vm.availableNavSections).toContain('tracking');
    expect(vm.etaStatusChip).toContain('delay');
    expect(vm.tracking.movement).toBeDefined();
  });

  it('builds view model for fulfilled shipment with rating', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'fullfilled',
      carrier: 'Transmed Logistics S.A.',
    });
    expect(vm.status).toBe('fullfilled');
    expect(vm.canRate).toBe(true);
    expect(vm.billing.invoiceStatus).toBe('Paid');
  });

  it('builds view model for unfulfilled and cancelled shipments', () => {
    const vmUnfulfilled = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'not_fullfilled',
      carrier: 'Transmed Logistics S.A.',
    });
    expect(vmUnfulfilled.status).toBe('not_fullfilled');
    expect(vmUnfulfilled.unfulfilledReason).toBeDefined();

    const vmCancelled = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'canceled',
    });
    expect(vmCancelled.status).toBe('canceled');
    expect(vmCancelled.cancellationReason).toBeDefined();
  });
});
