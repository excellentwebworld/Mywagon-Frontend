/**
 * Google Places → Price List lane stop (PDS-935).
 * Address Book location_id is deprecated for price lanes.
 */

import { resolveCity } from '../../../mocks/priceListsData';

const COORD_MATCH_THRESHOLD_M = 100;

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeCity(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return (resolveCity(raw) || raw).toLowerCase();
}

function buildLabel(placeName, city, formattedAddress) {
  const name = String(placeName || '').trim();
  const c = String(city || '').trim();
  if (name && c && name !== c) return `${name} · ${c}`;
  if (formattedAddress) return formattedAddress;
  if (c) return c;
  return name || '';
}

/**
 * @param {import('../../AddressBook/utils/parseGooglePlaceAddress').ParsedPlaceAddress} parsed
 * @param {{ place_id?: string }} [extra]
 */
export function mapGooglePlaceToLaneStop(parsed, extra = {}) {
  if (!parsed) return null;

  const city = String(parsed.city || parsed.placeName || '').trim();
  const formatted = String(parsed.formattedAddress || parsed.address || '').trim();
  const value = resolveCity(city) || city || formatted;

  return {
    type: 'place',
    city,
    value,
    label: buildLabel(parsed.placeName, city, formatted),
    address: String(parsed.address || formatted).trim() || undefined,
    lat: parsed.lat || undefined,
    lng: parsed.lng || undefined,
    place_id: extra.place_id ? String(extra.place_id) : undefined,
    region: parsed.region || undefined,
    postal_code: parsed.postalCode || undefined,
    country: parsed.country || undefined,
    countryCode: undefined,
  };
}

export function hasCoordinates(stop) {
  return toNum(stop?.lat) != null && toNum(stop?.lng) != null;
}

export function isLegacyLaneStop(stop) {
  if (!stop) return false;
  const hasAbId = Boolean(stop.location_id ?? stop.locationId);
  return hasAbId && !hasCoordinates(stop);
}

export function isValidLaneStop(stop) {
  if (!stop) return false;
  const city = String(stop.city || stop.value || '').trim();
  if (!city) return false;
  return hasCoordinates(stop);
}

/** True when a stop has enough identity to show in the edit modal (city-only imports included). */
export function isDisplayableLaneStop(stop) {
  if (!stop) return false;
  return Boolean(
    String(stop.city || stop.value || stop.label || stop.address || '').trim()
    || hasCoordinates(stop),
  );
}

/** Imported or saved stop with a city name but no map pin yet. */
export function isCityOnlyLaneStop(stop) {
  if (!stop || isLegacyLaneStop(stop)) return false;
  const city = String(stop.city || stop.value || stop.label || '').trim();
  if (!city) return false;
  const hasAddress = String(stop.address || '').trim() !== '';
  return !hasCoordinates(stop) && !hasAddress;
}

export function coordsWithinThreshold(a, b, thresholdM = COORD_MATCH_THRESHOLD_M) {
  const lat1 = toNum(a?.lat);
  const lng1 = toNum(a?.lng);
  const lat2 = toNum(b?.lat);
  const lng2 = toNum(b?.lng);
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return false;

  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.sqrt(x));
  return dist <= thresholdM;
}

export function stopsAreSamePlace(a, b) {
  if (!a || !b) return false;

  const aPlaceId = a.place_id ?? a.placeId ?? null;
  const bPlaceId = b.place_id ?? b.placeId ?? null;
  if (aPlaceId && bPlaceId && String(aPlaceId) === String(bPlaceId)) return true;

  if (hasCoordinates(a) && hasCoordinates(b) && coordsWithinThreshold(a, b)) {
    const ac = normalizeCity(a.city || a.value);
    const bc = normalizeCity(b.city || b.value);
    if (ac && bc && ac === bc) return true;
  }

  const av = normalizeCity(a.value || a.city || a.label);
  const bv = normalizeCity(b.value || b.city || b.label);
  return Boolean(av && bv && av === bv);
}

/** Match a lane endpoint stop against a user-selected place stop. */
export function stopMatchesPlace(laneStop, placeStop) {
  if (!laneStop || !placeStop) return false;
  return stopsAreSamePlace(laneStop, placeStop);
}

export function normalizeLoadedLaneStop(stop) {
  if (!stop) return null;

  const city = String(stop.city || stop.value || '').trim();
  const value = resolveCity(city) || city || String(stop.value || '').trim();
  const label = stop.label || buildLabel('', city, stop.address || value);

  return {
    type: stop.type || 'place',
    city,
    value,
    label,
    address: stop.address || undefined,
    lat: stop.lat ?? undefined,
    lng: stop.lng ?? undefined,
    place_id: stop.place_id ?? stop.placeId ?? undefined,
    region: stop.region || undefined,
    postal_code: stop.postal_code ?? stop.postalCode ?? undefined,
    country: stop.country || undefined,
    countryCode: stop.countryCode || undefined,
    location_id: stop.location_id ?? stop.locationId ?? undefined,
  };
}

/** Strip deprecated Address Book id before API save. */
export function sanitizeStopForSave(stop) {
  if (!stop) return stop;
  const { location_id, locationId, ...rest } = stop;
  return {
    ...rest,
    type: rest.type || 'place',
    city: rest.city || rest.value || '',
    value: rest.value || rest.city || '',
  };
}

export function emptyLaneStop() {
  return null;
}
