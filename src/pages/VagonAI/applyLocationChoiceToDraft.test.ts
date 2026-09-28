import { describe, expect, it } from 'vitest';
import type { FlowDraftSeed } from '../../hooks/useChat';
import {
  applyLocationChoiceToDraft,
  ensureStopSchedules,
  ensureStopSchedules,
  formatLocalDateTime,
  inferLocationSlot,
  parseLocationOptionId,
} from './applyLocationChoiceToDraft';

function emptyGapDraft(): FlowDraftSeed {
  const line = (action: 'pick' | 'drop') => ({
    productId: '97',
    productName: 'QA E2E Peas',
    action,
    qty: 2,
    unit: 'EUR_PALLET' as const,
    weight: 250,
    wUnit: 'KG' as const,
    sourceUnit: 'Pallets',
    orderId: '78',
    orderLineId: '5511',
    customerId: '31',
  });
  return {
    customerReference: null,
    stops: [
      { locationId: '', locationName: 'Test Location Greece', from: '', to: null, lines: [line('pick')] },
      { locationId: '', locationName: 'WC1', from: '', to: null, lines: [line('drop')] },
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

describe('parseLocationOptionId', () => {
  it('strips the location: prefix', () => {
    expect(parseLocationOptionId('location:1841')).toBe('1841');
  });

  it('accepts bare numeric ids', () => {
    expect(parseLocationOptionId('1841')).toBe('1841');
  });

  it('rejects non-location option ids', () => {
    expect(parseLocationOptionId('product:97')).toBeNull();
    expect(parseLocationOptionId('new_location')).toBeNull();
  });
});

describe('inferLocationSlot', () => {
  it('prefers slot when present', () => {
    expect(inferLocationSlot({ slot: 'pickup', title: 'Pick delivery' })).toBe('pickup');
    expect(inferLocationSlot({ slot: 'delivery', title: 'Pick the pickup site' })).toBe('delivery');
  });

  it('infers from title when slot is missing', () => {
    expect(inferLocationSlot({ title: 'Pick the pickup site' })).toBe('pickup');
    expect(inferLocationSlot({ title: 'Choose the delivery location' })).toBe('delivery');
  });
});

describe('ensureStopSchedules', () => {
  it('fills tomorrow 09:00 / day-after 17:00 when locationId set and from empty', () => {
    const now = new Date(2026, 8, 19, 12, 0, 0); // 19 Sep 2026 local
    const draft = emptyGapDraft();
    draft.stops[0]!.locationId = '100';
    draft.stops[1]!.locationId = '200';
    const next = ensureStopSchedules(draft, now);
    expect(next.stops[0]!.from).toBe(formatLocalDateTime(new Date(2026, 8, 20, 9, 0, 0)));
    expect(next.stops[1]!.from).toBe(formatLocalDateTime(new Date(2026, 8, 21, 17, 0, 0)));
  });

  it('does not overwrite an existing from', () => {
    const draft = emptyGapDraft();
    draft.stops[0]!.locationId = '100';
    draft.stops[0]!.from = '2030-01-01T10:00';
    const next = ensureStopSchedules(draft, new Date(2026, 8, 19));
    expect(next.stops[0]!.from).toBe('2030-01-01T10:00');
  });
});

describe('applyLocationChoiceToDraft', () => {
  it('writes pickup then delivery and defaults schedules', () => {
    const now = new Date(2026, 8, 19, 12, 0, 0);
    let draft = emptyGapDraft();
    draft = applyLocationChoiceToDraft(draft, 'pickup', '1841', 'Test Location Greece', now);
    expect(draft.stops[0]!.locationId).toBe('1841');
    expect(draft.stops[0]!.locationName).toBe('Test Location Greece');
    expect(draft.stops[0]!.from).toBe(formatLocalDateTime(new Date(2026, 8, 20, 9, 0, 0)));

    draft = applyLocationChoiceToDraft(draft, 'delivery', '1842', 'WC1', now);
    expect(draft.stops[1]!.locationId).toBe('1842');
    expect(draft.stops[1]!.locationName).toBe('WC1');
    expect(draft.stops[1]!.from).toBe(formatLocalDateTime(new Date(2026, 8, 21, 17, 0, 0)));
  });

  it('ensures two stops when the seed only has pickup', () => {
    const now = new Date(2026, 8, 19, 12, 0, 0);
    const one: FlowDraftSeed = {
      ...emptyGapDraft(),
      stops: [emptyGapDraft().stops[0]!],
    };
    const next = applyLocationChoiceToDraft(one, 'delivery', '99', 'WC1', now);
    expect(next.stops).toHaveLength(2);
    expect(next.stops[1]!.locationId).toBe('99');
  });
});

describe('ensureStopSchedules past dates', () => {
  it('bumps a past pickup from into tomorrow 09:00 so saveIssues Route clears', () => {
    const now = new Date(2026, 8, 19, 12, 0, 0); // 19 Sep 2026
    const draft = {
      stops: [
        { locationId: '10', locationName: 'Greece', from: '2026-09-18T08:00', to: null, lines: [] },
        { locationId: '20', locationName: 'WC1', from: '2026-09-22T08:00', to: null, lines: [] },
      ],
    };
    const next = ensureStopSchedules(draft, now);
    expect(next.stops[0]!.from).toBe('2026-09-20T09:00');
    // delivery still in the future — leave it
    expect(next.stops[1]!.from).toBe('2026-09-22T08:00');
  });
});
