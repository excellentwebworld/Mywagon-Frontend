import { describe, expect, it } from 'vitest';
import {
  buildEditDiffHighlights,
  hasAnyStopHighlight,
  isNewLine,
  isNewStop,
  oldItineraryToDisplayStops,
  walkWizardLineIndexes,
} from './editDiff';
import type { ApiStop } from '../../api/types/createShipment';

describe('editDiff', () => {
  const sampleStops: ApiStop[] = [
    {
      id: 'stop-1',
      locationId: '10',
      locationName: 'Ioannina',
      dateFrom: '2026-09-20',
      timeFrom: '14:45',
      appointmentMode: 'fixed',
      lines: [
        {
          id: 'line-1',
          productId: '1',
          productName: 'Pallets',
          action: 'pickup',
          qty: '18',
          weight: '500',
        },
      ],
    },
    {
      id: 'stop-2',
      locationId: '20',
      locationName: 'Athens',
      dateFrom: '2026-09-22',
      timeFrom: '14:45',
      appointmentMode: 'fixed',
      lines: [
        {
          id: 'line-2',
          productId: '1',
          productName: 'Pallets',
          action: 'dropoff',
          qty: '18',
          weight: '500',
        },
      ],
    },
  ];

  it('produces empty highlights when difference is empty or null', () => {
    const res1 = buildEditDiffHighlights(sampleStops, null);
    expect(res1.stops).toEqual({});
    expect(res1.lines).toEqual({});

    const res2 = buildEditDiffHighlights(sampleStops, {});
    expect(res2.stops).toEqual({});
    expect(res2.lines).toEqual({});
  });

  it('ignores unchanged empty fields or matching old/new values in diff', () => {
    const diff = {
      '0': {
        date_to: { new: '' },
        time_to: { old: '', new: '' },
        date: { old: '2026-09-20', new: '2026-09-20' },
      },
    };

    const res = buildEditDiffHighlights(sampleStops, diff as any);
    expect(res.stops[0]).toBeUndefined();
    expect(hasAnyStopHighlight(res.stops[0])).toBe(false);
  });

  it('accurately highlights changed date or time independently', () => {
    const diff = {
      '0': {
        time: { old: '14:45', new: '16:00' },
      },
      '1': {
        date: { old: '2026-09-22', new: '2026-09-23' },
      },
    };

    const res = buildEditDiffHighlights(sampleStops, diff as any);
    expect(res.stops[0]?.time).toBe(true);
    expect(res.stops[0]?.date).toBeUndefined();
    expect(hasAnyStopHighlight(res.stops[0])).toBe(true);

    expect(res.stops[1]?.date).toBe(true);
    expect(res.stops[1]?.time).toBeUndefined();
    expect(hasAnyStopHighlight(res.stops[1])).toBe(true);
  });

  it('keeps date unhighlighted when only shipment time is changed', () => {
    const diff = {
      '0': {
        time: { old: '20:00', new: '21:30' },
      },
      '1': {
        time: { old: '20:30', new: '21:40' },
      },
    };

    const res = buildEditDiffHighlights(sampleStops, diff as any);
    expect(res.stops[0]?.time).toBe(true);
    expect(res.stops[0]?.date).toBeUndefined();
    expect(res.stops[1]?.time).toBe(true);
    expect(res.stops[1]?.date).toBeUndefined();
  });

  it('accurately highlights changed line fields', () => {
    const diff = {
      '0': {
        qty: { old: '18', new: '25' },
      },
    };

    const res = buildEditDiffHighlights(sampleStops, diff as any);
    expect(res.lines['0:0']?.qty).toBe(true);
    expect(res.lines['0:0']?.weight).toBeUndefined();
  });

  it('walks wizard line indexes matching backend flat index order', () => {
    const indexes = walkWizardLineIndexes(sampleStops);
    expect(indexes).toEqual([
      { stopIndex: 0, lineIndex: 0 },
      { stopIndex: 1, lineIndex: 0 },
    ]);
  });

  it('converts old itinerary rows to display stops', () => {
    const rows = [
      {
        shipment_location_id: 101,
        order_id: 'ORD-1',
        product_id: '1',
        address_id: '10',
        qty: '18',
        weight: '500',
        date: '2026-09-20',
        time: '14:45',
        date_to: '',
        time_to: '',
        type: 'pickup',
      },
    ];

    const stops = oldItineraryToDisplayStops(rows);
    expect(stops).toHaveLength(1);
    expect(stops[0].dateFrom).toBe('2026-09-20');
    expect(stops[0].timeFrom).toBe('14:45');
    expect(stops[0].lines).toHaveLength(1);
    expect(stops[0].lines[0].qty).toBe('18');
  });

  it('correctly identifies newly added stops and lines vs existing DB stops', () => {
    const oldItinerary = [
      {
        shipment_location_id: 101,
        order_id: 'ORD-1',
        product_id: '1',
        address_id: '10',
        qty: '18',
        weight: '500',
        date: '2026-09-20',
        time: '14:45',
        date_to: '',
        time_to: '',
        type: 'pickup',
      },
      {
        shipment_location_id: 102,
        order_id: 'ORD-1',
        product_id: '1',
        address_id: '20',
        qty: '18',
        weight: '500',
        date: '2026-09-22',
        time: '14:45',
        date_to: '',
        time_to: '',
        type: 'dropoff',
      },
    ];

    const existingStop: ApiStop = {
      id: 'stop-1',
      locationId: '10',
      dateFrom: '2026-09-20',
      timeFrom: '14:45',
      lines: [
        {
          id: 'loc-101',
          shipmentLocationId: 101,
          productId: '1',
          action: 'pickup',
          qty: '18',
          weight: '500',
        },
      ],
    };

    const newlyAddedStop: ApiStop = {
      id: 'stop-new-3',
      locationId: '30',
      dateFrom: '2026-09-23',
      timeFrom: '18:00',
      lines: [
        {
          id: 'line-client-uuid-999',
          productId: '2',
          action: 'dropoff',
          qty: '5',
          weight: '100',
        },
      ],
    };

    expect(isNewStop(existingStop, oldItinerary)).toBe(false);
    expect(isNewLine(existingStop.lines![0], oldItinerary)).toBe(false);

    expect(isNewStop(newlyAddedStop, oldItinerary)).toBe(true);
    expect(isNewLine(newlyAddedStop.lines![0], oldItinerary)).toBe(true);
  });
});
