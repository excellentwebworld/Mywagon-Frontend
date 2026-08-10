import React, { useEffect, useRef } from 'react';
import { parseGooglePlace, type ParsedPlaceAddress } from '../../pages/AddressBook/utils/parseGooglePlaceAddress';

type Props = {
  address: string;
  lat: string;
  lng: string;
  onAddressChange: (address: string) => void;
  onLatLngChange: (lat: string, lng: string) => void;
  /** Called with all parsed address fields when a Google Place is selected */
  onPlaceSelected?: (details: ParsedPlaceAddress) => void;
  /** @deprecated Prefer onPlaceSelected */
  onCityPostalChange?: (city: string, postal: string) => void;
  showCoordinates?: boolean;
  error?: string;
  hideHint?: boolean;
  hideLabel?: boolean;
  inputId?: string;
  /** Extra Google Places Autocomplete options (no country restriction by default). */
  autocompleteOptions?: Record<string, unknown>;
};

type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    name?: string;
    place_id?: string;
    geometry?: { location?: { lat: () => number; lng: () => number } };
    address_components?: { types: string[]; long_name: string; short_name: string }[];
  };
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: any
          ) => GoogleAutocomplete;
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

let mapsScriptLoading: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptLoading) return mapsScriptLoading;

  mapsScriptLoading = new Promise((resolve, reject) => {
    window.initGoogleMapsCallback = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return mapsScriptLoading;
}

export const GoogleMapAddressField: React.FC<Props> = ({
  address,
  lat,
  lng,
  onAddressChange,
  onLatLngChange,
  onPlaceSelected,
  onCityPostalChange,
  showCoordinates = false,
  error,
  hideHint = false,
  hideLabel = false,
  inputId = 'ab-address-input',
  autocompleteOptions,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  const onAddressChangeRef = useRef(onAddressChange);
  const onLatLngChangeRef = useRef(onLatLngChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onCityPostalChangeRef = useRef(onCityPostalChange);

  onAddressChangeRef.current = onAddressChange;
  onLatLngChangeRef.current = onLatLngChange;
  onPlaceSelectedRef.current = onPlaceSelected;
  onCityPostalChangeRef.current = onCityPostalChange;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let autocomplete: GoogleAutocomplete | null = null;
    const inputEl = inputRef.current;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputEl || !window.google) return;

        autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
          fields: ['formatted_address', 'geometry', 'address_components', 'name', 'place_id'],
          ...autocompleteOptions,
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          if (!place) return;

          const parsed = parseGooglePlace(place);
          if (!parsed) return;

          onAddressChangeRef.current(parsed.address);
          onLatLngChangeRef.current(parsed.lat, parsed.lng);
          onPlaceSelectedRef.current?.(parsed);

          // Legacy callback for callers not yet migrated
          if (onCityPostalChangeRef.current) {
            onCityPostalChangeRef.current(parsed.city, parsed.postalCode);
          }
        });
      })
      .catch(() => {
        // Manual entry when maps unavailable
      });

    return () => {
      autocomplete = null;
    };
  }, [apiKey, autocompleteOptions]);

  return (
    <div className={`ab-map-field${error ? ' has-error' : ''}`}>
      {!hideLabel && (
        <label className="ab-label" htmlFor={inputId}>
          Address <span className="req">*</span>
        </label>
      )}
      <input
        id={inputId}
        ref={inputRef}
        className="ab-input"
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder={apiKey ? 'Start typing address…' : 'Enter address manually'}
        autoComplete="off"
      />
      {!hideHint && !apiKey && (
        <p className="ab-field-hint">Set VITE_GOOGLE_MAPS_KEY for Google Places autocomplete.</p>
      )}
      {!hideHint && apiKey && (
        <p className="ab-field-hint">Select an address from suggestions to auto-fill city and postal code.</p>
      )}
      {error && <p className="ab-field-error">{error}</p>}
      {showCoordinates && (
        <div className="ab-coords-row">
          <input
            className="ab-input"
            value={lat}
            onChange={(e) => onLatLngChange(e.target.value, lng)}
            placeholder="Latitude"
            aria-label="Latitude"
          />
          <input
            className="ab-input"
            value={lng}
            onChange={(e) => onLatLngChange(lat, e.target.value)}
            placeholder="Longitude"
            aria-label="Longitude"
          />
        </div>
      )}
    </div>
  );
};

export type { ParsedPlaceAddress };
