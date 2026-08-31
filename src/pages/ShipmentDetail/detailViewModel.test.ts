import { describe, it, expect } from 'vitest';
import { buildShipmentDetailViewModel } from './detailViewModel';
import type { Shipment } from '../../context/AppContext';

const baseMockShipment: Shipment = {
  id: 'shp-123',
  autoId: 'SHP-1234',
  date: '18/02/2026',
  status: 'draft',
  vis: 'private',
  channel: 'private',
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
  cargoValue: 12500,
  updated: '18/02/2026',
  timeline: [],
  tl_cur: 0,
};

describe('buildShipmentDetailViewModel (Comprehensive Phase-Wise Tests)', () => {
  // Phase 1: Draft Lifecycle
  it('Phase 1: builds view model for draft shipment with wizard resumption support', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'draft',
      loadSummary: {
        vehicleTypes: ['Semi-Trailer', 'Mega Box'],
        cargoSpecs: ['Curtainside', 'ADR'],
        quote: '€ 410.00',
        loadValue: '€ 12,500.00',
        channel: 'Private',
        negotiable: true,
        liveNavigation: true,
        specialInstructions: 'Handle with care',
      },
    });

    expect(vm.displayId).toBe('SHP-1234');
    expect(vm.status).toBe('draft');
    expect(vm.availableNavSections).toContain('stops');
    expect(vm.availableNavSections).toContain('load');
    expect(vm.availableNavSections).not.toContain('bids');
    expect(vm.availableNavSections).not.toContain('tracking');
    expect(vm.carrier).toBeNull();
    expect(vm.loadSummary.vehicleTypes).toEqual(['Semi-Trailer', 'Mega Box']);
    expect(vm.loadSummary.specialInstructions).toBe('Handle with care');
  });

  // Phase 2: Pending Status & Bids / Partners Negotiation
  it('Phase 2: builds view model for pending private load with sorted bids and partners', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'pending',
      channel: 'private',
      vis: 'private',
      offers: [
        {
          id: 'bid-1',
          name: 'Transmed Logistics',
          type: 'bid',
          price: 400,
          rating: 4.9,
          ratingCount: 320,
          transporterType: 'carrier',
          respondedAt: '2026-02-26T11:45:00Z',
        },
      ],
      invitees: [
        {
          id: 102,
          name: 'Hellas Freight Express',
          role: 'carrier',
          invitedAt: '2026-02-26T11:46:00Z',
        },
      ],
    });

    expect(vm.status).toBe('pending');
    expect(vm.isPrivateLoad).toBe(true);
    expect(vm.availableNavSections).toContain('bids');
    expect(vm.partners.length).toBe(2);

    // Bid should be sorted before invited partner without bid
    expect(vm.partners[0].hasBid).toBe(true);
    expect(vm.partners[0].name).toBe('Transmed Logistics');
    expect(vm.partners[0].bidAmount).toBe(400);

    expect(vm.partners[1].hasBid).toBe(false);
    expect(vm.partners[1].name).toBe('Hellas Freight Express');
  });

  it('Phase 2: handles public load without incoming bids', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'pending',
      channel: 'public',
      vis: 'public',
      offers: [],
      invitees: [],
    });

    expect(vm.status).toBe('pending');
    expect(vm.isPrivateLoad).toBe(false);
    expect(vm.partners.length).toBe(0);
  });

  // Phase 3: Scheduled, Ready & Transporter Management
  it('Phase 3: builds view model for scheduled load with Company Carrier and nested Company Driver', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'scheduled',
      carrier: 'Transmed Logistics S.A.',
      carrierType: 'carrier',
      carrierRating: 4.8,
      carrierId: 101,
      assignedDriverName: 'Ανδρέας Λύτρας',
      assignedDriverId: 201,
      assignedDriverRating: 4.8,
      assignedDriverPlates: ['ΙΧΕ-7890', 'ΤΡ-4512'],
    });

    expect(vm.status).toBe('scheduled');
    expect(vm.carrier).not.toBeNull();
    expect(vm.carrier?.name).toBe('Transmed Logistics S.A.');
    expect(vm.carrier?.userType).toBe('carrier');
    expect(vm.assignedDriver).not.toBeNull();
    expect(vm.assignedDriver?.name).toBe('Ανδρέας Λύτρας');
    expect(vm.assignedDriver?.plates).toEqual(['ΙΧΕ-7890', 'ΤΡ-4512']);
    expect(vm.availableNavSections).toContain('carrier');
    expect(vm.availableNavSections).not.toContain('tracking');
  });

  it('Phase 3: builds view model for Freelancer Transporter layout', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'ready',
      carrier: 'Nikos Georgiou',
      carrierType: 'driver',
      carrierRating: 4.7,
      carrierId: 301,
      assignedDriverPlates: ['ΒΕ-1234', 'ΤΡ-9988'],
    });

    expect(vm.status).toBe('ready');
    expect(vm.carrier?.userType).toBe('driver');
    expect(vm.carrier?.meta).toBe('Freelancer');
    expect(vm.carrier?.plates).toEqual(['ΒΕ-1234', 'ΤΡ-9988']);
  });

  // Phase 4: On Trip, Live Tracking & Share Tracking
  it('Phase 4: builds view model for on_trip load with live tracking and delay indicator', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'on_trip',
      carrier: 'Transmed Logistics S.A.',
      at_risk: true,
      riskReason: 'Delayed in traffic (+20 min)',
      stops: [
        {
          id: 1,
          type: 'pickup',
          location: 'Athens Warehouse',
          locationStatus: '3', // Completed pickup
        },
        {
          id: 2,
          type: 'delivery',
          location: 'Thessaloniki Hub',
          locationStatus: '4', // In transit
        },
      ],
    });

    expect(vm.status).toBe('on_trip');
    expect(vm.availableNavSections).toContain('tracking');
    expect(vm.isDelayed).toBe(true);
    expect(vm.etaStatusChip).toContain('Delayed');
    expect(vm.isPickedUp).toBe(true); // Share tracking copy-link active!
  });

  // Phase 5: Fulfilled Status, Inline POD & Trip Rating
  it('Phase 5: builds view model for fulfilled shipment with completed POD and existing rating', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'fullfilled',
      carrier: 'Transmed Logistics S.A.',
      stops: [
        {
          id: 1,
          type: 'pickup',
          location: 'Athens Warehouse',
          locationStatus: '3',
        },
        {
          id: 2,
          type: 'delivery',
          location: 'Thessaloniki Hub',
          locationStatus: '7',
          pod: '1',
        },
      ],
      shipperRating: {
        id: 55,
        rating: 5,
        review: 'Excellent service, punctual driver',
        deliveryOnTime: true,
        createdAt: '2026-02-28T14:30:00Z',
      },
    });

    expect(vm.status).toBe('fullfilled');
    expect(vm.canRate).toBe(true);
    expect(vm.isAlreadyRated).toBe(true);
    expect(vm.userRating).toBe(5);
    expect(vm.ratingDeliveryOnTime).toBe(true);
    expect(vm.stops[1].pod).toBe('1');
    expect(vm.billing.invoiceStatus).toBe('Paid');
  });

  // Phase 6: Cancellation, Unfulfilled & Partially Fulfilled
  it('Phase 6: builds view model for cancelled shipment with reason and timestamp', () => {
    const vm = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'canceled',
      cancellationReason: 'Production line delay / shipper cancellation',
      cancellationDate: '2026-02-20T10:15:00Z',
      cancellationDetails: 'Cancelled · Full refund issued',
    });

    expect(vm.status).toBe('canceled');
    expect(vm.cancellationReason).toBe('Production line delay / shipper cancellation');
    expect(vm.cancellationDate).toBe('2026-02-20T10:15:00Z');
    expect(vm.cancellationDetails).toBe('Cancelled · Full refund issued');
  });

  it('Phase 6: builds view model for unfulfilled and partially fulfilled loads', () => {
    const vmUnfulfilled = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'not_fullfilled',
      unfulfilledReason: 'Engine breakdown during transit',
      unfulfilledDate: '2026-02-22T16:00:00Z',
    });

    expect(vmUnfulfilled.status).toBe('not_fullfilled');
    expect(vmUnfulfilled.unfulfilledReason).toBe('Engine breakdown during transit');
    expect(vmUnfulfilled.unfulfilledDate).toBe('2026-02-22T16:00:00Z');

    const vmPartiallyFulfilled = buildShipmentDetailViewModel({
      ...baseMockShipment,
      status: 'partially_fullfilled',
    });

    expect(vmPartiallyFulfilled.status).toBe('partially_fullfilled');
    expect(vmPartiallyFulfilled.availableNavSections).toContain('docs');
    expect(vmPartiallyFulfilled.availableNavSections).toContain('billing');
  });
});
