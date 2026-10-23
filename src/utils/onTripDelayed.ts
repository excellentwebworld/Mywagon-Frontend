import { parseUtcInstant } from './timezone';

/** Temporary manual-check window. Restore to 4 hours after verification. */
export const ON_TRIP_DELAY_GRACE_MS = 1 * 60 * 1000;

export type OnTripDelayedInput = {
  status?: string | null;
  /** Dropoff window end. Used ahead of the scheduled dropoff when it parses. */
  windowEnd?: string | null;
  /** Scheduled dropoff time, used when there is no window end. */
  scheduled?: string | null;
  /**
   * Server substatus. When the API sends a non-empty value it is the source of
   * truth, so the badge matches the backend instead of a local clock.
   */
  subStatus?: string | null;
  now?: Date;
};

export type DropoffStopSchedule = {
  date?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  datetime?: string | null;
  dateIso?: string | null;
  toDateIso?: string | null;
};

export function isOnTripStatus(status?: string | null): boolean {
  const key = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'on_trip' || key === 'ontrip' || key === 'in_progress' || key === 'inprogress';
}

function isDelayedToken(value?: string | null): boolean {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return key === 'delayed';
}

/** True when an On Trip load should show the Delayed sub-label. */
export function isOnTripOverdueDelayed(input: OnTripDelayedInput): boolean {
  if (!isOnTripStatus(input.status)) return false;

  const explicit = input.subStatus;
  if (explicit != null && String(explicit).trim() !== '') {
    return isDelayedToken(explicit);
  }

  const anchor = parseUtcInstant(input.windowEnd) ?? parseUtcInstant(input.scheduled);
  if (!anchor) return false;

  const now = input.now ?? new Date();
  return now.getTime() > anchor.getTime() + ON_TRIP_DELAY_GRACE_MS;
}

function hasClock(value: string): boolean {
  return value.includes('T') || /\d{1,2}:\d{2}/.test(value);
}

/** Window end, then scheduled time, from a delivery stop. ISO fields win over display text. */
export function dropoffAnchorsFromStop(stop?: DropoffStopSchedule | null): {
  windowEnd: string | null;
  scheduled: string | null;
} {
  if (!stop) return { windowEnd: null, scheduled: null };

  const toDateIso = stop.toDateIso?.trim() || '';
  const dateIso = stop.dateIso?.trim() || '';
  if (toDateIso || dateIso) {
    return {
      windowEnd: toDateIso || null,
      scheduled: dateIso || null,
    };
  }

  const rawDate = String(stop.datetime || stop.date || '').trim();
  const timeEnd = String(stop.timeEnd || '').trim();
  const timeStart = String(stop.timeStart || '').trim();
  const combine = (time: string): string | null => {
    if (!rawDate) return null;
    if (!time || hasClock(rawDate)) return rawDate;
    return `${rawDate} ${time}`;
  };

  return {
    windowEnd: timeEnd ? combine(timeEnd) : null,
    scheduled: timeStart ? combine(timeStart) : rawDate || null,
  };
}

/**
 * Last delivery stop when it has ISO instants; otherwise the load-level
 * dropoff ISO; otherwise the stop's display schedule.
 */
export function resolveDropoffAnchors(input: {
  windowEndIso?: string | null;
  scheduledIso?: string | null;
  stop?: DropoffStopSchedule | null;
}): { windowEnd: string | null; scheduled: string | null } {
  if (input.stop?.toDateIso?.trim() || input.stop?.dateIso?.trim()) {
    return dropoffAnchorsFromStop(input.stop);
  }
  const windowEndIso = input.windowEndIso?.trim() || '';
  const scheduledIso = input.scheduledIso?.trim() || '';
  if (windowEndIso || scheduledIso) {
    return {
      windowEnd: windowEndIso || null,
      scheduled: scheduledIso || null,
    };
  }
  return dropoffAnchorsFromStop(input.stop);
}
