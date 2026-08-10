export type GoogleAddressComponent = {
  types: string[];
  long_name: string;
  short_name: string;
};

export interface ParsedPlaceAddress {
  /** Value for the street / location address field */
  address: string;
  formattedAddress: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
  lat: string;
  lng: string;
  placeName: string;
  place_id?: string;
}

function findComponent(components: GoogleAddressComponent[], ...types: string[]): GoogleAddressComponent | undefined {
  for (const type of types) {
    const match = components.find((c) => c.types.includes(type));
    if (match) return match;
  }
  return undefined;
}

function componentValue(components: GoogleAddressComponent[], ...types: string[]): string {
  return findComponent(components, ...types)?.long_name ?? '';
}

/**
 * Parse Google Places `address_components` into form fields.
 * Handles Greek/EU addresses where city may appear as locality, postal_town, or admin_level_3.
 */
export function parseGoogleAddressComponents(components: GoogleAddressComponent[]): Omit<
  ParsedPlaceAddress,
  'formattedAddress' | 'lat' | 'lng' | 'placeName' | 'address'
> {
  const streetNumber = componentValue(components, 'street_number');
  const route = componentValue(components, 'route');
  const neighborhood = componentValue(components, 'neighborhood', 'sublocality_level_1', 'sublocality');

  const city =
    componentValue(components, 'locality', 'postal_town', 'administrative_area_level_3') ||
    neighborhood;

  const postalCode = componentValue(components, 'postal_code');

  // Prefer regional unit (level 2) for Greece, fall back to level 1 (e.g. "Attica")
  const admin2 = componentValue(components, 'administrative_area_level_2');
  const admin1 = componentValue(components, 'administrative_area_level_1');
  const region = admin2 || admin1;

  const country = componentValue(components, 'country');

  return {
    city,
    postalCode,
    region,
    country,
  };
}

export function buildStreetAddress(components: GoogleAddressComponent[], formattedAddress: string): string {
  const streetNumber = componentValue(components, 'street_number');
  const route = componentValue(components, 'route');

  if (route) {
    return [streetNumber, route].filter(Boolean).join(' ').trim();
  }

  return formattedAddress.trim();
}

export function parseGooglePlace(place: {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  geometry?: { location?: { lat: () => number; lng: () => number } };
  address_components?: GoogleAddressComponent[];
}): ParsedPlaceAddress | null {
  if (!place.geometry?.location) return null;

  const formattedAddress = place.formatted_address?.trim() ?? '';
  const components = place.address_components ?? [];
  const parsed = parseGoogleAddressComponents(components);
  const streetLine = buildStreetAddress(components, formattedAddress);

  return {
    address: formattedAddress || streetLine,
    formattedAddress: formattedAddress || streetLine,
    city: parsed.city,
    postalCode: parsed.postalCode,
    region: parsed.region,
    country: parsed.country,
    lat: String(place.geometry.location.lat()),
    lng: String(place.geometry.location.lng()),
    placeName: place.name?.trim() ?? '',
    place_id: place.place_id?.trim() || undefined,
  };
}
