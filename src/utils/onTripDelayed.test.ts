import { describe, expect, it } from 'vitest';
import {
  dropoffAnchorsFromStop,
  isOnTripOverdueDelayed,
  ON_TRIP_DELAY_GRACE_MS,
  resolveDropoffAnchors,
} from './onTripDelayed';

const ANCHOR = '2026-10-23T10:00:00Z';
const anchorMs = Date.parse(ANCHOR);

describe('isOnTripOverdueDelayed', () => {
  it('marks an On Trip load delayed after the grace window', () => {
    expect(
      isOnTripOverdueDelayed({
        status: 'on_trip',
        windowEnd: ANCHOR,
        scheduled: '2026-10-23T08:00:00Z',
        now: new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS + 1),
      }),
    ).toBe(true);
  });

  it('stays clear at exactly the grace window and before that', () => {
    expect(
      isOnTripOverdueDelayed({
        status: 'on_trip',
        windowEnd: ANCHOR,
        now: new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS),
      }),
    ).toBe(false);
    expect(
      isOnTripOverdueDelayed({
        status: 'in_progress',
        windowEnd: ANCHOR,
        now: new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS - 60_000),
      }),
    ).toBe(false);
  });

  it('uses the scheduled dropoff when there is no window end', () => {
    expect(
      isOnTripOverdueDelayed({
        status: 'on-trip',
        scheduled: ANCHOR,
        now: new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS + 1),
      }),
    ).toBe(true);
  });

  it('ignores loads that are not On Trip, and invalid or missing dates', () => {
    const late = new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS + 1);
    expect(isOnTripOverdueDelayed({ status: 'scheduled', windowEnd: ANCHOR, now: late })).toBe(false);
    expect(isOnTripOverdueDelayed({ status: 'on_trip', windowEnd: 'not-a-date', now: late })).toBe(false);
    expect(isOnTripOverdueDelayed({ status: 'on_trip', now: late })).toBe(false);
    expect(isOnTripOverdueDelayed({ status: 'on_trip', windowEnd: '1970-01-01T00:00:00Z', now: late })).toBe(
      false,
    );
  });

  it('prefers an explicit API substatus over the local clock', () => {
    const early = new Date(anchorMs);
    expect(
      isOnTripOverdueDelayed({
        status: 'on_trip',
        windowEnd: ANCHOR,
        subStatus: 'delayed',
        now: early,
      }),
    ).toBe(true);
    expect(
      isOnTripOverdueDelayed({
        status: 'On Trip',
        windowEnd: ANCHOR,
        subStatus: 'on_time',
        now: new Date(anchorMs + ON_TRIP_DELAY_GRACE_MS + 1),
      }),
    ).toBe(false);
    expect(
      isOnTripOverdueDelayed({
        status: 'ready',
        subStatus: 'delayed',
        now: early,
      }),
    ).toBe(false);
  });
});

describe('dropoff anchors', () => {
  it('prefers the stop window-end ISO over display times', () => {
    expect(
      dropoffAnchorsFromStop({
        date: '23/10/2026',
        timeStart: '08:00',
        timeEnd: '10:00',
        dateIso: '2026-10-23T08:00:00Z',
        toDateIso: '2026-10-23T10:00:00Z',
      }),
    ).toEqual({
      windowEnd: '2026-10-23T10:00:00Z',
      scheduled: '2026-10-23T08:00:00Z',
    });
  });

  it('builds display anchors and falls back to load-level ISO when the stop has none', () => {
    expect(
      dropoffAnchorsFromStop({
        date: '23/10/2026',
        timeStart: '08:00',
        timeEnd: '10:00',
      }),
    ).toEqual({
      windowEnd: '23/10/2026 10:00',
      scheduled: '23/10/2026 08:00',
    });

    expect(
      resolveDropoffAnchors({
        windowEndIso: '2026-10-23T12:00:00Z',
        scheduledIso: '2026-10-23T11:00:00Z',
        stop: { date: '23/10/2026', timeStart: '08:00', timeEnd: '10:00' },
      }),
    ).toEqual({
      windowEnd: '2026-10-23T12:00:00Z',
      scheduled: '2026-10-23T11:00:00Z',
    });
  });
});
