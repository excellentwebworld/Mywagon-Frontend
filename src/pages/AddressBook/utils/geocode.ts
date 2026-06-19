export interface GeocodeResult {
  lat: string;
  lng: string;
  displayName?: string;
}

export async function geocodeAddress(address: string, city: string, postal = ''): Promise<GeocodeResult | null> {
  const query = [address, city, postal, 'Greece'].filter(Boolean).join(', ');
  if (!query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
  })}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  const results = (await response.json()) as { lat: string; lon: string; display_name?: string }[];
  if (!results.length) return null;

  return {
    lat: results[0].lat,
    lng: results[0].lon,
    displayName: results[0].display_name,
  };
}
