import React, { useEffect, useRef } from 'react';

type Props = {
  address: string;
  lat: string;
  lng: string;
  onAddressChange: (address: string) => void;
  onLatLngChange: (lat: string, lng: string) => void;
  onCityPostalChange?: (city: string, postal: string) => void;
};

type GoogleAutocomplete = {
  addListener: (event: string, handler: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    geometry?: { location?: { lat: () => number; lng: () => number } };
    address_components?: { types: string[]; long_name: string }[];
  };
};

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { fields?: string[] }
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => {
              formatted_address?: string;
              geometry?: { location?: { lat: () => number; lng: () => number } };
              address_components?: { types: string[]; long_name: string }[];
            };
          };
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

let mapsScriptLoading: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
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
  onCityPostalChange,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    let autocomplete: GoogleAutocomplete | null = null;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current || !window.google) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'address_components'],
        }) as GoogleAutocomplete;
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          if (!place?.geometry?.location) return;
          const formatted = place.formatted_address ?? inputRef.current?.value ?? '';
          onAddressChange(formatted);
          onLatLngChange(String(place.geometry.location.lat()), String(place.geometry.location.lng()));

          let city = '';
          let postal = '';
          place.address_components?.forEach((component: { types: string[]; long_name: string }) => {
            if (component.types.includes('locality')) city = component.long_name;
            if (component.types.includes('postal_code')) postal = component.long_name;
          });
          if (onCityPostalChange && (city || postal)) {
            onCityPostalChange(city, postal);
          }
        });
      })
      .catch(() => {
        // Fallback: manual entry when maps unavailable
      });

    return () => {
      autocomplete = null;
    };
  }, [apiKey, onAddressChange, onLatLngChange, onCityPostalChange]);

  return (
    <div className="ab-map-field">
      <label className="ab-label" htmlFor="ab-address-input">
        Address
      </label>
      <input
        id="ab-address-input"
        ref={inputRef}
        className="ab-input"
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder={apiKey ? 'Start typing address…' : 'Enter address manually'}
      />
      {!apiKey && (
        <p className="ab-field-hint">Set VITE_GOOGLE_MAPS_KEY for Google Places autocomplete.</p>
      )}
      <div className="ab-coords-row">
        <input className="ab-input" value={lat} onChange={(e) => onLatLngChange(e.target.value, lng)} placeholder="Latitude" />
        <input className="ab-input" value={lng} onChange={(e) => onLatLngChange(lat, e.target.value)} placeholder="Longitude" />
      </div>
    </div>
  );
};
