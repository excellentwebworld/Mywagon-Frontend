import type { AvailableTruck } from './types';

type AvailabilityClock = Pick<
  AvailableTruck,
  'startDt' | 'startTm' | 'endDt' | 'endTm' | 'isTimeRange'
>;

/** Clock text beside the start date. A single posted time is not shown as a range. */
export function availabilityClockLabel(truck: AvailabilityClock): string {
  if (!truck.isTimeRange || !truck.endTm) return truck.startTm;
  if (truck.endDt && truck.endDt !== '—' && truck.endDt !== truck.startDt) {
    return `${truck.startTm} – ${truck.endDt} ${truck.endTm}`;
  }
  if (truck.endTm !== truck.startTm) return `${truck.startTm} – ${truck.endTm}`;
  return truck.startTm;
}

/** Full availability window, including the start date. */
export function availabilityWindowLabel(truck: AvailabilityClock): string {
  const date = truck.startDt && truck.startDt !== '—' ? truck.startDt : '';
  const clock = availabilityClockLabel(truck);
  return [date, clock].filter(Boolean).join(' ');
}
