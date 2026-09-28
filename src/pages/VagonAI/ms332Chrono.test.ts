import { describe, expect, it } from 'vitest';
import { ensureStopSchedules } from './applyLocationChoiceToDraft';

describe('MS3-332 chronological schedules', () => {
  it('moves a still-future delivery that sits before a bumped pickup', () => {
    const now = new Date('2026-09-21T13:30:00');
    const draft = ensureStopSchedules(
      {
        stops: [
          { locationId: '10', from: '2020-01-01T08:00' },
          { locationId: '20', from: '2026-09-21T17:00' },
        ],
      },
      now,
    );
    const t0 = new Date(draft.stops[0]!.from).getTime();
    const t1 = new Date(draft.stops[1]!.from).getTime();
    expect(t1).toBeGreaterThan(t0);
  });
});
