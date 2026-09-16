import { describe, expect, it } from 'vitest';
import { validateSatFilterDates } from './satFilterValidation';

describe('Search Trucks Filter Date Validation', () => {
  const today = '2026-09-16';

  it('returns no errors when both dates are empty', () => {
    const res = validateSatFilterDates('', '', today);
    expect(res.hasErrors).toBe(false);
    expect(res.startDateError).toBeUndefined();
    expect(res.endDateError).toBeUndefined();
  });

  it('flags inverted date range when End Date is before Start Date', () => {
    const res = validateSatFilterDates('2026-09-25', '2026-09-05', today);
    expect(res.hasErrors).toBe(true);
    expect(res.startDateError).toBeUndefined();
    expect(res.endDateError).toBe('satFilterEndDateBeforeStartDate');
  });

  it('flags Start Date when in the past', () => {
    const res = validateSatFilterDates('2020-01-01', '2026-09-25', today);
    expect(res.hasErrors).toBe(true);
    expect(res.startDateError).toBe('satFilterPastDateError');
    expect(res.endDateError).toBeUndefined();
  });

  it('flags End Date when in the past', () => {
    const res = validateSatFilterDates('', '2020-01-01', today);
    expect(res.hasErrors).toBe(true);
    expect(res.startDateError).toBeUndefined();
    expect(res.endDateError).toBe('satFilterPastDateError');
  });

  it('passes when date range is valid (future dates, start <= end)', () => {
    const res = validateSatFilterDates('2026-09-25', '2026-09-30', today);
    expect(res.hasErrors).toBe(false);
    expect(res.startDateError).toBeUndefined();
    expect(res.endDateError).toBeUndefined();
  });

  it('passes when start date and end date are on the same day', () => {
    const res = validateSatFilterDates('2026-09-25', '2026-09-25', today);
    expect(res.hasErrors).toBe(false);
    expect(res.startDateError).toBeUndefined();
    expect(res.endDateError).toBeUndefined();
  });
});
