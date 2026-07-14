import React, { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';

type Props = {
  id: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  radius: number | null;
  onAddressChange: (address: string) => void;
  onLatLngChange: (lat: number | null, lng: number | null) => void;
  onRadiusChange: (radius: number | null) => void;
  t: (key: string) => string;
};

export const FilterLocationField: React.FC<Props> = ({
  id,
  label,
  address,
  lat,
  lng,
  radius,
  onAddressChange,
  onLatLngChange,
  onRadiusChange,
  t,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const onAddressChangeRef = useRef(onAddressChange);
  const onLatLngChangeRef = useRef(onLatLngChange);
  const onRadiusChangeRef = useRef(onRadiusChange);
  const radiusRef = useRef(radius);

  onAddressChangeRef.current = onAddressChange;
  onLatLngChangeRef.current = onLatLngChange;
  onRadiusChangeRef.current = onRadiusChange;
  radiusRef.current = radius;

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let autocomplete: { addListener: (e: string, h: () => void) => void; getPlace: () => any } | null = null;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!inputRef.current || !window.google?.maps?.places) return;
        autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'name'],
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          const location = place?.geometry?.location;
          if (!location) return;
          onAddressChangeRef.current(place.formatted_address || place.name || '');
          onLatLngChangeRef.current(location.lat(), location.lng());
          if (radiusRef.current == null) onRadiusChangeRef.current(50);
        });
      })
      .catch(() => undefined);

    return () => {
      autocomplete = null;
    };
  }, [apiKey]);

  const clear = () => {
    onAddressChange('');
    onLatLngChange(null, null);
    onRadiusChange(null);
  };

  return (
    <div className="mgmt-pop-field">
      <label htmlFor={id} className="mgmt-pop-label">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        className="mgmt-pop-input"
        value={address}
        onChange={(e) => {
          onAddressChange(e.target.value);
          if (!e.target.value) {
            onLatLngChange(null, null);
            onRadiusChange(null);
          }
        }}
        placeholder={t('filterLocationPlaceholder')}
        autoComplete="off"
      />
      <div className="mgmt-loc-meta">
        <label className="mgmt-loc-radius">
          <span>{t('filterRadius')}</span>
          <select
            className="mgmt-pop-input mgmt-pop-input--sm"
            value={radius ?? ''}
            onChange={(e) => onRadiusChange(e.target.value ? Number(e.target.value) : null)}
            disabled={lat == null || lng == null}
          >
            <option value="">{t('filterRadiusSelect')}</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
          </select>
        </label>
        {(address || lat != null) && (
          <button type="button" className="mgmt-loc-clear" onClick={clear}>
            {t('clear')}
          </button>
        )}
      </div>
    </div>
  );
};
