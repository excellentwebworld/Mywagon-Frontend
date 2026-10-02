import { describe, expect, it } from 'vitest';
import {
  isDispatcherSeatLimitReached,
  normalizeDispatcherSeats,
} from './dispatcherSeats';

describe('dispatcherSeats', () => {
  it('normalizes can_invite when seats remain (Main Shipper must not block)', () => {
    const seats = normalizeDispatcherSeats({
      used: 0,
      total: 1,
      remaining: 0,
      can_invite: false,
      plan: 'Essential',
    });

    expect(seats).toEqual({
      used: 0,
      total: 1,
      remaining: 1,
      can_invite: true,
      plan: 'Essential',
    });
    expect(isDispatcherSeatLimitReached(seats)).toBe(false);
  });

  it('marks limit reached only when used >= total', () => {
    expect(
      isDispatcherSeatLimitReached({
        used: 1,
        total: 1,
        remaining: 0,
        can_invite: false,
        plan: null,
      }),
    ).toBe(true);

    expect(
      isDispatcherSeatLimitReached({
        used: 0,
        total: 1,
        remaining: 1,
        can_invite: true,
        plan: null,
      }),
    ).toBe(false);
  });

  it('falls back to entitlement remaining when seats meta is missing', () => {
    expect(isDispatcherSeatLimitReached(null, 0)).toBe(true);
    expect(isDispatcherSeatLimitReached(null, 2)).toBe(false);
    expect(isDispatcherSeatLimitReached(null, null)).toBe(false);
  });
});
