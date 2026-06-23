export interface TimeRangeLike {
  start_time?: string;
  end_time?: string;
}

export function getTimeRangeError(range: TimeRangeLike): string | null {
  const start = range.start_time?.trim() ?? '';
  const end = range.end_time?.trim() ?? '';
  if (!start && !end) return 'Start time and end time are required';
  if (!start) return 'Start time is required';
  if (!end) return 'End time is required';
  if (start >= end) return 'End time must be after start time';
  return null;
}

export function validateTimeRangesList(ranges: TimeRangeLike[] | undefined): string | null {
  if (!ranges?.length) return 'Add at least one preferred time range';
  for (const range of ranges) {
    const error = getTimeRangeError(range);
    if (error) return error;
  }
  return null;
}

export function areTimeRangesValid(ranges: TimeRangeLike[] | undefined): boolean {
  return validateTimeRangesList(ranges ?? []) === null;
}
