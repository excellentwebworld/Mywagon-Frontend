export interface SatFilterDateValidationResult {
  startDateError?: string;
  endDateError?: string;
  hasErrors: boolean;
}

/**
 * Validates the "Available From" date range in Search Trucks filter.
 * Checks for past dates and inverted date ranges (End Date before Start Date).
 */
export function validateSatFilterDates(
  startDate: string | undefined | null,
  endDate: string | undefined | null,
  todayStr: string,
  t: (key: string) => string = (k) => k
): SatFilterDateValidationResult {
  const start = String(startDate ?? '').trim();
  const end = String(endDate ?? '').trim();

  const isStartInPast = Boolean(start && start < todayStr);
  const isEndInPast = Boolean(end && end < todayStr);
  const isInverted = Boolean(start && end && end < start);

  const startDateError = isStartInPast
    ? (t('satFilterPastDateError') || 'Date cannot be in the past')
    : undefined;

  const endDateError = isInverted
    ? (t('satFilterEndDateBeforeStartDate') || 'End date cannot be before start date')
    : isEndInPast
      ? (t('satFilterPastDateError') || 'Date cannot be in the past')
      : undefined;

  return {
    startDateError,
    endDateError,
    hasErrors: Boolean(startDateError || endDateError),
  };
}
