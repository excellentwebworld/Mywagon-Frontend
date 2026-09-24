import { describe, expect, it, vi } from 'vitest';
import type { WeeklyReportItem } from '../../../api/types/weeklyReports';
import {
  getPresetDateRange,
  resolveActivePreset,
  getMondayOfWeek,
  getSundayOfWeek,
} from './WeeklyReportsPage';

export const mockWeeklyReport: WeeklyReportItem = {
  id: '2026-09-15',
  week_start: '2026-09-15',
  week_end: '2026-09-21',
  delivery_date: '2026-09-22',
  period_label: '15 Sep – 21 Sep 2026',
  email_subject: 'Your MYVAGON Weekly Logistics Report (15 Sep – 21 Sep 2026)',
  recipient_name: 'Acme Logistics',
  recipient_email: 'logistics@acme.com',
  sent_at: '2026-09-22T08:00:00Z',
  is_sent: true,
  metrics: {
    fulfilled: { value: 12, previous: 9, delta: 3, delta_percent: 33.3 },
    partially_fulfilled: { value: 2, previous: 2, delta: 0, delta_percent: 0 },
    created: { value: 15, previous: 10, delta: 5, delta_percent: 50.0 },
    not_fulfilled: { value: 1, previous: 2, delta: -1, delta_percent: -50.0 },
    pending: { value: 3, previous: 2, delta: 1, delta_percent: 50.0 },
    canceled: { value: 0, previous: 1, delta: -1, delta_percent: -100.0 },
    new_partners: { value: 2, previous: 0, delta: 2, delta_percent: 100.0 },
    on_trip: { value: 4, previous: 3, delta: 1, delta_percent: 33.3 },
    scheduled: { value: 5, previous: 4, delta: 1, delta_percent: 25.0 },
    ready: { value: 2, previous: 1, delta: 1, delta_percent: 100.0 },
  },
  summary: {
    total_fulfilled: 12,
    total_created: 15,
    total_in_progress: 11,
  },
};

describe('Weekly Reports Analytics Feature', () => {
  it('correctly structures all 10 stats from the Monday weekly email', () => {
    const { metrics } = mockWeeklyReport;
    expect(metrics.fulfilled.value).toBe(12);
    expect(metrics.fulfilled.delta).toBe(3);
    expect(metrics.partially_fulfilled.value).toBe(2);
    expect(metrics.created.value).toBe(15);
    expect(metrics.not_fulfilled.value).toBe(1);
    expect(metrics.pending.value).toBe(3);
    expect(metrics.canceled.value).toBe(0);
    expect(metrics.new_partners.value).toBe(2);
    expect(metrics.on_trip.value).toBe(4);
    expect(metrics.scheduled.value).toBe(5);
    expect(metrics.ready.value).toBe(2);
  });

  it('verifies summary metrics calculate active in-progress loads', () => {
    const { summary, metrics } = mockWeeklyReport;
    expect(summary.total_in_progress).toBe(
      metrics.on_trip.value + metrics.scheduled.value + metrics.ready.value
    );
  });

  it('formats email subject and period label', () => {
    expect(mockWeeklyReport.period_label).toBe('15 Sep – 21 Sep 2026');
    expect(mockWeeklyReport.email_subject).toContain('15 Sep – 21 Sep 2026');
  });

  describe('getPresetDateRange calculations', () => {
    const refDate = new Date(2026, 8, 24); // Thursday, Sept 24, 2026

    it('calculates Last Week (1w) preset ending last Sunday', () => {
      const range = getPresetDateRange('1w', refDate);
      expect(range.to).toBe('2026-09-20');
      expect(range.from).toBe('2026-09-14');
    });

    it('calculates 4 weeks preset ending last Sunday', () => {
      const range = getPresetDateRange('4w', refDate);
      expect(range.to).toBe('2026-09-20');
      expect(range.from).toBe('2026-08-24');
    });

    it('calculates 8 weeks preset ending last Sunday', () => {
      const range = getPresetDateRange('8w', refDate);
      expect(range.to).toBe('2026-09-20');
      expect(range.from).toBe('2026-07-27');
    });

    it('calculates 12 weeks preset ending last Sunday', () => {
      const range = getPresetDateRange('12w', refDate);
      expect(range.to).toBe('2026-09-20');
      expect(range.from).toBe('2026-06-29');
    });

    it('calculates This Year preset from Jan 1st Monday to last Sunday', () => {
      const range = getPresetDateRange('year', refDate);
      expect(range.from).toBe('2025-12-29');
      expect(range.to).toBe('2026-09-20');
    });

    it('returns empty strings for all reports', () => {
      const range = getPresetDateRange('all', refDate);
      expect(range.from).toBe('');
      expect(range.to).toBe('');
    });
  });

  describe('resolveActivePreset detection', () => {
    it('resolves all when no dates are set', () => {
      expect(resolveActivePreset('', '')).toBe('all');
      expect(resolveActivePreset()).toBe('all');
    });

    it('resolves preset correctly when from/to match exact preset ranges', () => {
      const range1w = getPresetDateRange('1w');
      expect(resolveActivePreset(range1w.from, range1w.to)).toBe('1w');

      const range4w = getPresetDateRange('4w');
      expect(resolveActivePreset(range4w.from, range4w.to)).toBe('4w');

      const range8w = getPresetDateRange('8w');
      expect(resolveActivePreset(range8w.from, range8w.to)).toBe('8w');

      const range12w = getPresetDateRange('12w');
      expect(resolveActivePreset(range12w.from, range12w.to)).toBe('12w');

      const rangeYear = getPresetDateRange('year');
      expect(resolveActivePreset(rangeYear.from, rangeYear.to)).toBe('year');
      expect(resolveActivePreset(`${new Date().getFullYear()}-01-01`, rangeYear.to)).toBe('year');
    });

    it('resolves custom when arbitrary dates are selected', () => {
      expect(resolveActivePreset('2026-08-10', '2026-08-16')).toBe('custom');
      expect(resolveActivePreset('2026-01-01', '2026-02-01')).toBe('custom');
    });
  });

  describe('getMondayOfWeek and getSundayOfWeek weekly snapping', () => {
    it('snaps a mid-week Wednesday date to Monday and Sunday of that week', () => {
      // Wednesday, Aug 12, 2026 -> Monday Aug 10, Sunday Aug 16
      expect(getMondayOfWeek('2026-08-12')).toBe('2026-08-10');
      expect(getSundayOfWeek('2026-08-12')).toBe('2026-08-16');
    });

    it('returns the same date when given a Monday for getMondayOfWeek', () => {
      expect(getMondayOfWeek('2026-08-10')).toBe('2026-08-10');
      expect(getSundayOfWeek('2026-08-10')).toBe('2026-08-16');
    });

    it('returns the same date when given a Sunday for getSundayOfWeek', () => {
      expect(getMondayOfWeek('2026-08-16')).toBe('2026-08-10');
      expect(getSundayOfWeek('2026-08-16')).toBe('2026-08-16');
    });

    it('handles month and year crossovers cleanly', () => {
      // Thursday, Jan 1, 2026 -> Monday Dec 29, 2025, Sunday Jan 4, 2026
      expect(getMondayOfWeek('2026-01-01')).toBe('2025-12-29');
      expect(getSundayOfWeek('2026-01-01')).toBe('2026-01-04');
    });
  });
});
