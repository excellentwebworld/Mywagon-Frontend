import { describe, expect, it } from 'vitest';
import { dateRangesOverlap, findLaneConflict, scopesOverlap } from './laneConflict';

describe('laneConflict', () => {
  it('dateRangesOverlap detects overlapping and adjacent windows', () => {
    expect(dateRangesOverlap('2026-01-01', '2026-01-31', '2026-01-15', '2026-02-15')).toBe(true);
    expect(dateRangesOverlap('2026-01-01', '2026-01-31', '2026-02-01', '2026-02-28')).toBe(false);
    expect(dateRangesOverlap('2026-01-01', null, '2026-06-01', null)).toBe(true);
  });

  it('scopesOverlap allows default + specific partner on same route', () => {
    expect(scopesOverlap('default', [], null, 'specific', ['2046'], null)).toBe(false);
    expect(scopesOverlap('specific', ['2046'], null, 'default', [], null)).toBe(false);
    expect(scopesOverlap('default', [], null, 'default', [], null)).toBe(true);
    expect(scopesOverlap('specific', ['1'], null, 'specific', ['2'], null)).toBe(false);
    expect(scopesOverlap('specific', ['1', '2'], null, 'specific', ['2', '3'], null)).toBe(true);
  });

  it('findLaneConflict allows specific partner when default lane exists on same route', () => {
    const lanes = [{
      id: 'APL-1',
      status: 'active',
      stops: [{ city: 'Athens' }, { city: 'Patras' }],
      effectiveFrom: '2026-03-01',
      effectiveTo: '2026-03-31',
      scope: 'default',
      scopePartnerIds: [],
    }];

    const specificPartner = findLaneConflict({
      stops: [{ city: 'Athens' }, { city: 'Patras' }],
      effectiveFrom: '2026-03-15',
      effectiveTo: '2026-04-15',
      scope: 'specific',
      scopePartnerIds: ['2046'],
    }, lanes);

    expect(specificPartner).toBeNull();
  });

  it('findLaneConflict matches route + dates + scope only', () => {
    const lanes = [{
      id: 'APL-1',
      status: 'active',
      stops: [{ city: 'Athens' }, { city: 'Patras' }],
      effectiveFrom: '2026-03-01',
      effectiveTo: '2026-03-31',
      scope: 'default',
      scopePartnerIds: [],
    }];

    const nonOverlappingDates = findLaneConflict({
      stops: [{ city: 'Athens' }, { city: 'Patras' }],
      effectiveFrom: '2026-04-01',
      effectiveTo: '2026-04-30',
      scope: 'default',
      scopePartnerIds: [],
    }, lanes);

    expect(nonOverlappingDates).toBeNull();

    const overlapping = findLaneConflict({
      stops: [{ city: 'Athens' }, { city: 'Patras' }],
      effectiveFrom: '2026-03-15',
      effectiveTo: '2026-04-15',
      scope: 'default',
      scopePartnerIds: [],
    }, lanes);

    expect(overlapping?.id).toBe('APL-1');
  });
});
