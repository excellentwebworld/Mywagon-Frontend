import { describe, expect, it } from 'vitest';
import {
  MAX_LOAD_COPIES,
  loadCopiesQuotaShortfall,
  normalizeLoadCopies,
  publishedLoadsFromResponse,
} from './loadCopies';

describe('MS3-403 normalizeLoadCopies', () => {
  it('defaults blank / garbage to one copy', () => {
    for (const raw of [undefined, null, '', 'abc', NaN]) {
      expect(normalizeLoadCopies(raw)).toBe(1);
    }
  });

  it('clamps to 1..20 and drops fractions', () => {
    expect(normalizeLoadCopies(0)).toBe(1);
    expect(normalizeLoadCopies(-3)).toBe(1);
    expect(normalizeLoadCopies('5')).toBe(5);
    expect(normalizeLoadCopies(2.9)).toBe(2);
    expect(normalizeLoadCopies(21)).toBe(MAX_LOAD_COPIES);
    expect(normalizeLoadCopies('999')).toBe(20);
  });
});

describe('MS3-403 loadCopiesQuotaShortfall', () => {
  it('is null when the plan has room, is unlimited, or the quota is unknown', () => {
    expect(loadCopiesQuotaShortfall({ remaining: 5 }, 5)).toBeNull();
    expect(loadCopiesQuotaShortfall({ remaining: null, is_unlimited: true }, 20)).toBeNull();
    expect(loadCopiesQuotaShortfall({ remaining: 1, is_unlimited: true }, 20)).toBeNull();
    expect(loadCopiesQuotaShortfall(null, 3)).toBeNull();
    expect(loadCopiesQuotaShortfall({}, 3)).toBeNull();
  });

  it('returns how many loads are left when copies exceed it', () => {
    expect(loadCopiesQuotaShortfall({ remaining: 2 }, 3)).toBe(2);
    expect(loadCopiesQuotaShortfall({ remaining: 0, status: false }, 2)).toBe(0);
  });
});

describe('MS3-403 publishedLoadsFromResponse', () => {
  it('lists every copy when the backend returns them', () => {
    const loads = publishedLoadsFromResponse({
      id: 10,
      auto_id: 'SID-1',
      copies: [
        { id: 10, auto_id: 'SID-1' },
        { id: 11, auto_id: 'SID-2' },
        { id: 12, auto_id: 'SID-3' },
      ],
    });
    expect(loads.map((l) => l.auto_id)).toEqual(['SID-1', 'SID-2', 'SID-3']);
  });

  it('falls back to the single load for an older backend', () => {
    expect(publishedLoadsFromResponse({ id: 7, auto_id: 'SID-7', status: 'pending' })).toEqual([
      { id: 7, auto_id: 'SID-7', status: 'pending', type: undefined },
    ]);
    expect(publishedLoadsFromResponse(null)).toEqual([]);
  });
});
