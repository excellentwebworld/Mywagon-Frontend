import type { ApiStop } from '../../../api/types/createShipment';
import type { DriveGapLevel, DriveGapWarning, MockWeather, RouteLeg } from './types';
import { formatDurationMin } from './cargoUtils';

const DEFAULT_HOLIDAYS = [
  '2026-01-01',
  '2026-01-06',
  '2026-03-25',
  '2026-05-01',
  '2026-08-15',
  '2026-10-28',
  '2026-12-25',
  '2026-12-26',
];

export function formatAppointmentLabel(stop: ApiStop): string {
  if (!stop.dateFrom) return '';
  let label = stop.dateFrom;
  if (stop.timeFrom) label += ` · ${stop.timeFrom}`;
  if (stop.timeTo) label += ` – ${stop.timeTo}`;
  else if (stop.dateTo && stop.dateTo !== stop.dateFrom) label += ` → ${stop.dateTo}`;
  return label;
}

export function formatStopScheduleShort(stop: ApiStop): string {
  if (!stop.dateFrom) return '—';
  const datePart = stop.dateFrom.length >= 10 ? stop.dateFrom.slice(5) : stop.dateFrom;
  if (stop.timeFrom && stop.timeTo) return `${datePart} · ${stop.timeFrom}–${stop.timeTo}`;
  if (stop.timeFrom) return `${datePart} · ${stop.timeFrom}`;
  if (stop.dateTo && stop.dateTo !== stop.dateFrom) {
    const endPart = stop.dateTo.length >= 10 ? stop.dateTo.slice(5) : stop.dateTo;
    return `${datePart} → ${endPart}`;
  }
  return datePart;
}

function stopEndDate(stop: ApiStop): Date | null {
  const date = stop.dateTo || stop.dateFrom;
  if (!date) return null;
  const time = stop.timeTo || stop.timeFrom || '23:59';
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function stopStartDate(stop: ApiStop): Date | null {
  if (!stop.dateFrom) return null;
  const time = stop.timeFrom || '00:00';
  const d = new Date(`${stop.dateFrom}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeDriveGapWarnings(stops: ApiStop[], legs: RouteLeg[]): DriveGapWarning[] {
  return legs.map((leg) => {
    const prev = stops[leg.from];
    const next = stops[leg.to];
    if (!prev || !next) {
      return { ...leg, level: 'ok' as DriveGapLevel, msg: '' };
    }

    const prevEnd = stopEndDate(prev);
    const nextStart = stopStartDate(next);

    if (!prevEnd || !nextStart) {
      return { ...leg, level: 'ok' as DriveGapLevel, msg: '' };
    }

    const gapMin = (nextStart.getTime() - prevEnd.getTime()) / 60000;

    if (leg.durationMin > gapMin) {
      return {
        ...leg,
        level: 'red',
        msg: `Drive ${leg.label} exceeds ${Math.round(gapMin)}min gap`,
      };
    }
    if (leg.durationMin > gapMin * 0.8) {
      return {
        ...leg,
        level: 'amber',
        msg: `Drive ${leg.label} close to ${Math.round(gapMin)}min gap`,
      };
    }
    return { ...leg, level: 'ok', msg: '' };
  });
}

export function computeWeekendHolidayWarnings(
  stops: ApiStop[],
  holidays: string[] = DEFAULT_HOLIDAYS
): (string | null)[] {
  return stops.map((s) => {
    if (!s.dateFrom) return null;
    const dow = new Date(s.dateFrom).getDay();
    if (dow === 0) return 'Sunday — verify location is open';
    if (dow === 6) return 'Saturday — check hours';
    if (holidays.includes(s.dateFrom)) return 'Public holiday — may be closed';
    return null;
  });
}

/** Stable mock weather derived from stop identity (no external API). */
export function getMockWeather(city: string, locationId?: string): MockWeather {
  const seed = (locationId || city || 'default').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const profiles = [
    { icon: '🌤', desc: 'Partly cloudy', tempC: 24, wind: 12, rain: 0 },
    { icon: '☀️', desc: 'Clear sky', tempC: 28, wind: 8, rain: 0 },
    { icon: '🌧', desc: 'Light rain expected', tempC: 22, wind: 18, rain: 65 },
    { icon: '⛅', desc: 'Cloudy', tempC: 20, wind: 14, rain: 20 },
    { icon: '🌬', desc: 'Windy', tempC: 26, wind: 22, rain: 5 },
  ];
  const profile = profiles[seed % profiles.length];
  return { ...profile, alert: profile.rain > 50 };
}

export function buildHaversineLegs(
  coords: { lat: number; lng: number }[],
  avgSpeedKmh = 60
): RouteLeg[] {
  const legs: RouteLeg[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const distKm = haversineKm(coords[i], coords[i + 1]);
    const durationMin = (distKm / avgSpeedKmh) * 60;
    legs.push({
      from: i,
      to: i + 1,
      distKm: Math.round(distKm * 10) / 10,
      durationMin: Math.round(durationMin),
      label: formatDurationMin(Math.round(durationMin)),
    });
  }
  return legs;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export { haversineKm };
