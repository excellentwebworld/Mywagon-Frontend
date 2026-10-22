import { describe, expect, it } from 'vitest';
import { capacityRangeError, matchesCapacityFilter, parseCapacityBound, sanitizeCapacityDigits } from './capacityFilter';

describe('capacity filter', () => {
  it('any mode keeps every post', () => {
    expect(matchesCapacityFilter({ capVal: 0, mode: 'any' })).toBe(true);
    expect(matchesCapacityFilter({ capVal: 12, mode: 'any' })).toBe(true);
  });

  it('unspecified mode keeps only missing or non-positive capacity', () => {
    expect(matchesCapacityFilter({ capVal: null, mode: 'unspecified' })).toBe(true);
    expect(matchesCapacityFilter({ capVal: 0, mode: 'unspecified' })).toBe(true);
    expect(matchesCapacityFilter({ capVal: 12, mode: 'unspecified' })).toBe(false);
  });

  it('declared range excludes unspecified posts unless asked to include them', () => {
    const range = { mode: 'declared' as const, minCapacity: '10', maxCapacity: '20' };
    expect(matchesCapacityFilter({ ...range, capVal: 18 })).toBe(true);
    expect(matchesCapacityFilter({ ...range, capVal: 5 })).toBe(false);
    expect(matchesCapacityFilter({ ...range, capVal: null })).toBe(false);
    expect(
      matchesCapacityFilter({ ...range, capVal: null, includeUnspecified: true })
    ).toBe(true);
    expect(
      matchesCapacityFilter({ ...range, capVal: 5, includeUnspecified: true })
    ).toBe(false);
  });

  it('declared mode with no bounds keeps only posts that declare a positive quantity', () => {
    expect(matchesCapacityFilter({ capVal: 4, mode: 'declared' })).toBe(true);
    expect(matchesCapacityFilter({ capVal: 0, mode: 'declared', includeUnspecified: true })).toBe(
      false
    );
  });

  it('declared unit excludes posts that use a different unit', () => {
    const filter = {
      mode: 'declared' as const,
      minCapacity: '10',
      maxCapacity: '30',
      capacityUnit: 'EUR Pallets',
    };
    expect(matchesCapacityFilter({ ...filter, capVal: 25, capUnit: 'EUR Pallets' })).toBe(true);
    expect(matchesCapacityFilter({ ...filter, capVal: 25, capUnit: 'Boxes' })).toBe(false);
    expect(matchesCapacityFilter({ ...filter, capVal: null, capUnit: '', includeUnspecified: true })).toBe(
      true
    );
  });

  it('unit alone keeps declared posts of that unit', () => {
    expect(
      matchesCapacityFilter({
        capVal: 4,
        capUnit: 'Big Bags',
        mode: 'declared',
        capacityUnit: 'Big Bags',
      })
    ).toBe(true);
    expect(
      matchesCapacityFilter({
        capVal: 4,
        capUnit: 'Units',
        mode: 'declared',
        capacityUnit: 'Big Bags',
      })
    ).toBe(false);
  });

  it('keeps at most 5 digits and drops everything else', () => {
    expect(sanitizeCapacityDigits('12a.3')).toBe('123');
    expect(sanitizeCapacityDigits('1234567')).toBe('12345');
    expect(parseCapacityBound('12345')).toBe(12345);
    expect(parseCapacityBound('123456')).toBeNull();
    expect(parseCapacityBound('12.5')).toBeNull();
  });

  it('flags an inverted min/max range', () => {
    expect(capacityRangeError('20', '5')).toBe(true);
    expect(capacityRangeError('5', '20')).toBe(false);
    expect(capacityRangeError('', '20')).toBe(false);
  });
});