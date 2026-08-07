/**
 * Map an Address Book LocationItem to a Price List lane stop shape.
 * Aligns with Create Shipment: location_id + denormalized display fields.
 */

export function mapLocationToLaneStop(location) {
  if (!location) return null;

  const city = (location.city || '').trim() || (location.name || '').trim();
  const address = (location.address || '').trim();
  const name = (location.name || '').trim();
  const labelParts = [name, city || address].filter(Boolean);
  const label = labelParts.length > 0
    ? (name && city && name !== city ? `${name} · ${city}` : labelParts[0])
    : String(location.id);

  return {
    location_id: String(location.id),
    type: 'city',
    city,
    value: city || name || String(location.id),
    label,
    address: address || undefined,
    lat: location.lat != null && location.lat !== '' ? location.lat : undefined,
    lng: location.lng != null && location.lng !== '' ? location.lng : undefined,
    countryCode: undefined,
  };
}

export function isValidLaneStop(stop) {
  if (!stop) return false;
  if (stop.location_id) return true;
  return Boolean(stop.value || stop.city);
}

export function stopsAreSamePlace(a, b) {
  if (!a || !b) return false;
  const aId = a.location_id ?? a.locationId ?? null;
  const bId = b.location_id ?? b.locationId ?? null;
  if (aId && bId) {
    return String(aId) === String(bId);
  }
  // Address Book location vs legacy city stop — not the same place
  if (aId || bId) return false;
  const av = (a.value || a.city || '').toLowerCase();
  const bv = (b.value || b.city || '').toLowerCase();
  return Boolean(av && bv && av === bv);
}

export function normalizeLoadedLaneStop(stop) {
  if (!stop) return null;
  const locationId = stop.location_id ?? stop.locationId ?? null;
  const city = stop.city || stop.value || '';
  const value = stop.value || stop.city || '';
  const label = stop.label || city || value;

  if (locationId) {
    return {
      ...stop,
      location_id: String(locationId),
      type: stop.type || 'city',
      city,
      value,
      label,
      address: stop.address || undefined,
      lat: stop.lat,
      lng: stop.lng,
      countryCode: stop.countryCode,
    };
  }

  // Legacy cascade / free-text stops — keep denormalized fields, no location_id
  return {
    type: stop.type || 'city',
    city,
    value,
    label,
    address: stop.address || undefined,
    countryCode: stop.countryCode || 'GR',
    location_id: null,
  };
}
