import { useCallback, useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { PlaceSuggestion } from './SearchPlaceSuggestions';

type PlaceSelection = {
  city: string;
  label: string;
  lat: number | null;
  lng: number | null;
};

type GooglePlaces = {
  AutocompleteService: new () => {
    getPlacePredictions: (
      req: {
        input: string;
        componentRestrictions?: { country: string | string[] };
        types?: string[];
        sessionToken?: unknown;
      },
      cb: (
        predictions: Array<{
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text: string;
            secondary_text?: string;
          };
          types?: string[];
        }> | null,
        status: string
      ) => void
    ) => void;
  };
  PlacesService: new (attrContainer: HTMLDivElement) => {
    getDetails: (
      req: { placeId: string; fields: string[]; sessionToken?: unknown },
      cb: (
        place: {
          name?: string;
          formatted_address?: string;
          geometry?: { location?: { lat: () => number; lng: () => number } };
          address_components?: Array<{ types: string[]; long_name: string }>;
        } | null,
        status: string
      ) => void
    ) => void;
  };
  AutocompleteSessionToken: new () => unknown;
};

function getPlacesApi(): GooglePlaces | null {
  return (window.google?.maps?.places as unknown as GooglePlaces) ?? null;
}

function mapPrediction(p: {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string; secondary_text?: string };
  types?: string[];
}): PlaceSuggestion {
  return {
    placeId: p.place_id,
    primary: p.structured_formatting?.main_text || p.description,
    secondary: p.structured_formatting?.secondary_text || '',
    types: p.types || [],
  };
}

export function usePlaceSuggestions(opts: {
  apiKey?: string;
  query: string;
  enabled: boolean;
  language?: string;
}) {
  const { apiKey, query, enabled, language = 'en' } = opts;
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef<{
    autocomplete: InstanceType<GooglePlaces['AutocompleteService']> | null;
    places: InstanceType<GooglePlaces['PlacesService']> | null;
    token: unknown;
  }>({ autocomplete: null, places: null, token: null });
  const attrDivRef = useRef<HTMLDivElement | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !apiKey) return;
    let disposed = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (disposed) return;
        const places = getPlacesApi();
        if (!places) return;
        if (!attrDivRef.current) {
          attrDivRef.current = document.createElement('div');
        }
        serviceRef.current.autocomplete = new places.AutocompleteService();
        serviceRef.current.places = new places.PlacesService(attrDivRef.current);
        serviceRef.current.token = new places.AutocompleteSessionToken();
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [enabled, apiKey]);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      const ac = serviceRef.current.autocomplete;
      if (!ac) {
        setLoading(false);
        return;
      }
      ac.getPlacePredictions(
        {
          input: q,
          sessionToken: serviceRef.current.token ?? undefined,
        },
        (predictions, status) => {
          if (reqId !== reqIdRef.current) return;
          setLoading(false);
          if (status !== 'OK' || !predictions) {
            setSuggestions([]);
            return;
          }
          setSuggestions(predictions.slice(0, 6).map(mapPrediction));
        }
      );
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, enabled, language]);

  const resolvePlace = useCallback((suggestion: PlaceSuggestion): Promise<PlaceSelection> => {
    return new Promise((resolve) => {
      const places = serviceRef.current.places;
      if (!places) {
        resolve({
          city: suggestion.primary,
          label: suggestion.primary,
          lat: null,
          lng: null,
        });
        return;
      }
      places.getDetails(
        {
          placeId: suggestion.placeId,
          fields: ['name', 'formatted_address', 'geometry', 'address_components'],
          sessionToken: serviceRef.current.token ?? undefined,
        },
        (place, status) => {
          // Refresh session token after details (new search session)
          const api = getPlacesApi();
          if (api) serviceRef.current.token = new api.AutocompleteSessionToken();

          if (status !== 'OK' || !place) {
            resolve({
              city: suggestion.primary,
              label: suggestion.primary,
              lat: null,
              lng: null,
            });
            return;
          }
          const city =
            place.address_components?.find((c) => c.types.includes('locality'))?.long_name ||
            place.address_components?.find((c) => c.types.includes('postal_town'))?.long_name ||
            place.address_components?.find((c) =>
              c.types.includes('administrative_area_level_3')
            )?.long_name ||
            place.name ||
            suggestion.primary;
          resolve({
            city,
            label: place.formatted_address || place.name || suggestion.primary,
            lat: place.geometry?.location?.lat?.() ?? null,
            lng: place.geometry?.location?.lng?.() ?? null,
          });
        }
      );
    });
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, resolvePlace, clearSuggestions };
}

/** Geocode a free-text city when the user searches without picking a suggestion. */
export async function geocodeCityName(
  apiKey: string | undefined,
  city: string
): Promise<{ city: string; lat: number; lng: number } | null> {
  const q = city.trim();
  if (!q || !apiKey) return null;
  try {
    await loadGoogleMaps(apiKey);
    const maps = (window as any).google?.maps;
    if (!maps?.Geocoder) return null;
    const geocoder = new maps.Geocoder();
    const result = await new Promise<any[] | null>((resolve) => {
      geocoder.geocode({ address: q }, (results: any[] | null, status: string) => {
        resolve(status === 'OK' && results?.length ? results : null);
      });
    });
    if (!result?.[0]?.geometry?.location) return null;
    const loc = result[0].geometry.location;
    const components: Array<{ types: string[]; long_name: string }> =
      result[0].address_components || [];
    const resolvedCity =
      components.find((c) => c.types.includes('locality'))?.long_name ||
      components.find((c) => c.types.includes('postal_town'))?.long_name ||
      components.find((c) => c.types.includes('administrative_area_level_3'))?.long_name ||
      q;
    return {
      city: resolvedCity,
      lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
      lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
    };
  } catch {
    return null;
  }
}
