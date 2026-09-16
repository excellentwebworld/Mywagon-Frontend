import { describe, it, expect } from 'vitest';
import {
  formatDisplayDate,
  formatDisplayDateFromIso,
  formatDisplayDateTime,
  formatIsoDisplayDateTime,
} from './dateDisplay';
import {
  parseUtcInstant,
  formatUtcToDisplayDate,
  formatUtcToDisplayDateTime,
  formatCalendarDate,
} from './timezone';
import { groupItineraryStops } from '../pages/ManageShipments/utils/listingUtils';

describe('BUG-05: Date formatting & epoch fallback prevention', () => {
  it('rejects null, zero, and Unix epoch strings in parseUtcInstant', () => {
    expect(parseUtcInstant(null)).toBeNull();
    expect(parseUtcInstant(undefined)).toBeNull();
    expect(parseUtcInstant('')).toBeNull();
    expect(parseUtcInstant('0')).toBeNull();
    expect(parseUtcInstant('0000-00-00 00:00:00')).toBeNull();
    expect(parseUtcInstant('1970-01-01 00:00:00')).toBeNull();
    expect(parseUtcInstant('1970-01-01T00:00:00Z')).toBeNull();
    expect(parseUtcInstant('31/12/1969 00:00')).toBeNull();
    expect(parseUtcInstant('01/01/1970 00:00')).toBeNull();
  });

  it('formats valid UTC instants correctly in formatUtcToDisplayDate and formatUtcToDisplayDateTime', () => {
    const validIso = '2026-07-29T13:01:00Z';
    expect(formatUtcToDisplayDate(validIso, 'UTC')).toBe('29/07/2026');
    expect(formatUtcToDisplayDateTime(validIso, 'UTC')).toBe('29/07/2026 13:01');
  });

  it('returns empty string when given zero or epoch in formatUtcToDisplayDate and formatUtcToDisplayDateTime', () => {
    expect(formatUtcToDisplayDate('0')).toBe('');
    expect(formatUtcToDisplayDate('1970-01-01T00:00:00Z')).toBe('');
    expect(formatUtcToDisplayDateTime('0')).toBe('');
    expect(formatUtcToDisplayDateTime('1970-01-01T00:00:00Z')).toBe('');
    expect(formatUtcToDisplayDateTime('0000-00-00 00:00:00')).toBe('');
  });

  it('formats dates cleanly in dateDisplay helpers without 1969 fallback', () => {
    expect(formatDisplayDate('0')).toBe('');
    expect(formatDisplayDate('1970-01-01')).toBe('');
    expect(formatDisplayDate('2026-07-29')).toBe('29/07/2026');

    expect(formatDisplayDateFromIso('0')).toBe('');
    expect(formatDisplayDateFromIso('1970-01-01T00:00:00Z')).toBe('');
    expect(formatDisplayDateFromIso('2026-07-29T13:01:00Z')).toBe('29/07/2026');

    expect(formatIsoDisplayDateTime('0')).toBe('');
    expect(formatIsoDisplayDateTime('1970-01-01T00:00:00Z')).toBe('');

    expect(formatDisplayDateTime('0')).toBe('');
    expect(formatDisplayDateTime('1970-01-01', '00:00')).toBe('');
    expect(formatDisplayDateTime('2026-07-29', '13:01')).toBe('29/07/2026 13:01');

    expect(formatCalendarDate('0')).toBe('—');
    expect(formatCalendarDate('1970-01-01')).toBe('—');
  });

  it('cleans fallback dates in groupItineraryStops when pickup date is epoch/null', () => {
    const groups = groupItineraryStops([], {
      origin: 'Athens',
      dest: 'Thessaloniki',
      pickDt: '0',
      delDt: '29/07/2025 13:01',
    });

    expect(groups.length).toBe(2);
    expect(groups[0].date).toBe('');
    expect(groups[1].date).toBe('29/07/2025 13:01');
  });
});
