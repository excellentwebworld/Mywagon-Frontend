export interface TimeRangeLike {
  start_time?: string;
  end_time?: string;
}

type TFn = (key: string, fallback?: string) => string;

const defaultT: TFn = (_k, fb) => fb ?? _k;

export function getTimeRangeError(
  range: TimeRangeLike,
  t: TFn = defaultT
): string | null {
  const start = range.start_time?.trim() ?? '';
  const end = range.end_time?.trim() ?? '';
  if (!start && !end) {
    return t('abValStartEndRequired', 'Start time and end time are required');
  }
  if (!start) return t('abValStartRequired', 'Start time is required');
  if (!end) return t('abValEndRequired', 'End time is required');
  if (start >= end) {
    return t('abValEndAfterStart', 'End time must be after start time');
  }
  return null;
}

export function validateTimeRangesList(
  ranges: TimeRangeLike[] | undefined,
  t: TFn = defaultT
): string | null {
  if (!ranges?.length) {
    return t('abValPreferredTimeRangeMin', 'Add at least one preferred time range');
  }
  for (const range of ranges) {
    const error = getTimeRangeError(range, t);
    if (error) return error;
  }
  return null;
}

export function areTimeRangesValid(ranges: TimeRangeLike[] | undefined): boolean {
  return validateTimeRangesList(ranges ?? []) === null;
}
