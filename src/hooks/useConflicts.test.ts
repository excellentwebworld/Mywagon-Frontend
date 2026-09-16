import { describe, expect, it } from 'vitest';
import { computeConflicts } from './useConflicts';
import { getStopDoneBlockers, getConflictAnchor } from '../components/CreateShipmentWizard/validation';

describe('computeConflicts — Order remaining limit validation (BUG-04)', () => {
  const orderDetailsById = {
    'ord-101': {
      id: 101,
      orderReference: 'ORD-101',
      customerName: 'Acme Corp',
      companyEntityId: 5,
      lines: [
        {
          id: 1,
          productSkuId: 50,
          productName: 'Pallets of Goods',
          quantity: 20,
          unit: 'EUR Pallets',
          weight: 1000,
          weightUnit: 'kg',
        },
      ],
    } as any,
  };

  it('emits O5 blocker on stop and line when pickup quantity exceeds order limit', () => {
    const stops = [
      {
        id: 'stop-1',
        locationId: 'loc-1',
        locationName: 'Athens Hub',
        dateFrom: '2026-10-01',
        timeFrom: '09:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-1',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'pickup',
            qty: '999',
            unit: 'EUR Pallets',
            weight: '500',
            wtUnit: 'kg',
          },
        ],
      },
      {
        id: 'stop-2',
        locationId: 'loc-2',
        locationName: 'Thessaloniki Depot',
        dateFrom: '2026-10-02',
        timeFrom: '10:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-2',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'dropoff',
            qty: '999',
            unit: 'EUR Pallets',
            weight: '500',
            wtUnit: 'kg',
          },
        ],
      },
    ];

    const result = computeConflicts(stops, {
      orderDetailsById,
    });

    const o5Blocker = result.blockers.find(
      (c) => c.code === 'O5' && c.stopIndex === 0 && c.lineIndex === 0
    );
    expect(o5Blocker).toBeDefined();
    expect(o5Blocker?.severity).toBe('blocker');

    // Anchor check
    const anchor = getConflictAnchor(o5Blocker!);
    expect(anchor).toBe('stop-0-line-0-qty');

    // getStopDoneBlockers check — MUST block Done on Stop 1
    const stopDoneBlockers = getStopDoneBlockers(result.blockers, 0);
    expect(stopDoneBlockers.some((c) => c.code === 'O5')).toBe(true);
  });

  it('does NOT emit O5 blocker when quantity is within order limit', () => {
    const stops = [
      {
        id: 'stop-1',
        locationId: 'loc-1',
        locationName: 'Athens Hub',
        dateFrom: '2026-10-01',
        timeFrom: '09:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-1',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'pickup',
            qty: '20',
            unit: 'EUR Pallets',
            weight: '1000',
            wtUnit: 'kg',
          },
        ],
      },
      {
        id: 'stop-2',
        locationId: 'loc-2',
        locationName: 'Thessaloniki Depot',
        dateFrom: '2026-10-02',
        timeFrom: '10:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-2',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'dropoff',
            qty: '20',
            unit: 'EUR Pallets',
            weight: '1000',
            wtUnit: 'kg',
          },
        ],
      },
    ];

    const result = computeConflicts(stops, {
      orderDetailsById,
    });

    const o5Blockers = result.blockers.filter((c) => c.code === 'O5');
    expect(o5Blockers).toHaveLength(0);

    const stopDoneBlockers = getStopDoneBlockers(result.blockers, 0);
    expect(stopDoneBlockers.some((c) => c.code === 'O5')).toBe(false);
  });

  it('blocks dropoff when dropoff quantity exceeds picked up quantity', () => {
    const stops = [
      {
        id: 'stop-1',
        locationId: 'loc-1',
        locationName: 'Athens Hub',
        dateFrom: '2026-10-01',
        timeFrom: '09:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-1',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'pickup',
            qty: '10',
            unit: 'EUR Pallets',
            weight: '500',
            wtUnit: 'kg',
          },
        ],
      },
      {
        id: 'stop-2',
        locationId: 'loc-2',
        locationName: 'Thessaloniki Depot',
        dateFrom: '2026-10-02',
        timeFrom: '10:00',
        appointmentMode: 'fixed',
        lines: [
          {
            id: 'line-2',
            orderId: 'ord-101',
            orderRef: 'ORD-101',
            productId: '50',
            productName: 'Pallets of Goods',
            action: 'dropoff',
            qty: '15',
            unit: 'EUR Pallets',
            weight: '500',
            wtUnit: 'kg',
          },
        ],
      },
    ];

    const result = computeConflicts(stops, {
      orderDetailsById,
    });

    const o5DropoffBlocker = result.blockers.find(
      (c) => c.code === 'O5' && c.stopIndex === 1 && c.lineIndex === 0
    );
    expect(o5DropoffBlocker).toBeDefined();

    const stop2Blockers = getStopDoneBlockers(result.blockers, 1);
    expect(stop2Blockers.some((c) => c.code === 'O5')).toBe(true);
  });
});
