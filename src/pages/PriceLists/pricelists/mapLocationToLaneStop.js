/**
 * Re-exports lane stop helpers (Google Places — PDS-935).
 * @deprecated mapLocationToLaneStop — use mapGooglePlaceToLaneStop instead.
 */

export {
  mapGooglePlaceToLaneStop,
  isValidLaneStop,
  stopsAreSamePlace,
  stopMatchesPlace,
  normalizeLoadedLaneStop,
  sanitizeStopForSave,
  isLegacyLaneStop,
  hasCoordinates,
  emptyLaneStop,
} from './mapGooglePlaceToLaneStop';

/** @deprecated Address Book mapping removed from Price Lists */
export function mapLocationToLaneStop(location) {
  if (!location) return null;
  const city = (location.city || '').trim() || (location.name || '').trim();
  const address = (location.address || '').trim();
  const name = (location.name || '').trim();
  const label = name && city && name !== city ? `${name} · ${city}` : (name || city || address);
  return {
    type: 'place',
    city,
    value: city || name,
    label,
    address: address || undefined,
    lat: location.lat != null && location.lat !== '' ? location.lat : undefined,
    lng: location.lng != null && location.lng !== '' ? location.lng : undefined,
  };
}
