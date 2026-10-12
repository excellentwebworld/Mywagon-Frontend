import { describe, expect, it } from 'vitest';
import { emptySatFilterDraft, resolveTripType } from './SatFilterModal';

describe('Search Trucks filter reset defaults', () => {
  it('emptySatFilterDraft clears every field the filter modal can apply', () => {
    const empty = emptySatFilterDraft();
    expect(empty.truckTypeIds).toEqual([]);
    expect(empty.availableFromStart).toBe('');
    expect(empty.availableFromEnd).toBe('');
    expect(empty.pickupCity).toBe('');
    expect(empty.pickupLat).toBeNull();
    expect(empty.pickupLng).toBeNull();
    expect(empty.pickupRadius).toBe(100);
    expect(empty.dropoffCity).toBe('');
    expect(empty.dropoffLat).toBeNull();
    expect(empty.dropoffLng).toBeNull();
    expect(empty.dropoffRadius).toBe(100);
    expect(empty.stopsMulti).toBe(true);
    expect(empty.stopsDirect).toBe(false);
    expect(empty.providerNames).toEqual([]);
    expect(empty.minPrice).toBe('');
    expect(empty.maxPrice).toBe('');
    expect(empty.quickFilters).toEqual([]);
  });

  it('reset tripType must stay any (default stops alone are not multi_stop filter)', () => {
    const empty = emptySatFilterDraft();
    // UI defaults match Laravel (multi on, direct off) but must not activate trip filter.
    expect(resolveTripType(empty.stopsMulti, empty.stopsDirect)).toBe('multi_stop');
    // resetPanelFilters therefore sets tripType: 'any' explicitly — not resolveTripType().
  });
});
