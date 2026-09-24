import { describe, expect, it } from 'vitest';
import { buildTrackingDeliveryGroupKey } from './ShareTrackingModal';

describe('buildTrackingDeliveryGroupKey', () => {
  it('keeps same address separate when appointment times differ', () => {
    const base = {
      location: 'Amritsar123',
      address: 'Amritsar, Punjab, India',
      date: '25/09/2026',
    };

    const morning = buildTrackingDeliveryGroupKey({ ...base, timeStart: '14:35' });
    const evening = buildTrackingDeliveryGroupKey({ ...base, timeStart: '17:37' });

    expect(morning).not.toBe(evening);
  });

  it('groups multi-product lines at the same address and time', () => {
    const a = buildTrackingDeliveryGroupKey({
      location: 'Amritsar123',
      address: 'Amritsar, Punjab, India',
      date: '25/09/2026',
      timeStart: '14:35',
      timeEnd: '14:35',
    });
    const b = buildTrackingDeliveryGroupKey({
      location: 'Amritsar123',
      address: 'Amritsar, Punjab, India',
      date: '25/09/2026',
      timeStart: '14:35',
      timeEnd: '14:35',
    });

    expect(a).toBe(b);
  });
});
