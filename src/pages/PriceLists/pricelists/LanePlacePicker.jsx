import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { GoogleMapAddressField } from '../../../components/AddressBook/GoogleMapAddressField';
import {
  isLegacyLaneStop,
  isValidLaneStop,
  mapGooglePlaceToLaneStop,
} from './mapGooglePlaceToLaneStop';

/** Prefer addresses/places worldwide — no country restriction (PDS-935). */
const LANE_AUTOCOMPLETE_OPTIONS = {
  types: ['geocode', 'establishment'],
};

/**
 * Google Places picker for a single lane stop (origin, destination, or intermediate).
 */
export default function LanePlacePicker({ value, onChange, invalid = false, label }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const inputId = useId().replace(/:/g, '');
  const [draft, setDraft] = useState('');

  const selected = isValidLaneStop(value);

  useEffect(() => {
    if (selected) {
      setDraft(value.address || value.label || '');
    }
  }, [selected, value?.place_id, value?.lat, value?.lng, value?.address, value?.label]);

  const handleAddressChange = useCallback((text) => {
    setDraft(text);
    if (selected) {
      onChange?.(null);
    }
  }, [selected, onChange]);

  const handlePlaceSelected = useCallback((details) => {
    const stop = mapGooglePlaceToLaneStop(details, { place_id: details.place_id });
    if (!stop) return;
    setDraft(stop.address || stop.label || '');
    onChange?.(stop);
  }, [onChange]);

  const validationError = invalid
    ? (draft.trim() && !selected
      ? t(
        'priceLists.phase2.validation.selectFromSuggestions',
        'Select a location from the suggestions list.',
      )
      : t(
        'priceLists.phase2.validation.selectPlace',
        'Select an address from Google suggestions.',
      ))
    : undefined;

  const labelStyle = { fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 4, display: 'block' };

  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      {selected && (
        <div
          className="mb-2 px-3 py-2 rounded-lg"
          style={{ background: T.sa, border: `1px solid ${T.bd}`, fontSize: 11, color: T.t2 }}
        >
          <div style={{ fontWeight: 600, color: T.t1 }}>{value.label || value.city}</div>
          {value.address && value.address !== value.label && (
            <div style={{ marginTop: 2, color: T.t3 }}>{value.address}</div>
          )}
        </div>
      )}
      <div
        className="lane-place-picker"
        style={{
          '--ab-border': invalid ? '#EF4444' : T.bd,
        }}
      >
        <GoogleMapAddressField
          inputId={`lane-place-${inputId}`}
          hideLabel
          hideHint
          address={draft}
          lat={value?.lat != null ? String(value.lat) : ''}
          lng={value?.lng != null ? String(value.lng) : ''}
          onAddressChange={handleAddressChange}
          onLatLngChange={() => {}}
          onPlaceSelected={handlePlaceSelected}
          autocompleteOptions={LANE_AUTOCOMPLETE_OPTIONS}
          error={validationError}
        />
      </div>
      {isLegacyLaneStop(value) && (
        <div style={{ fontSize: 10, color: '#D97706', marginTop: 4 }}>
          {t('priceLists.modal.legacyStopHint', 'Previously: {{label}}. Re-select using address search.', {
            label: value.label || value.city || value.value || '—',
          })}
        </div>
      )}
    </div>
  );
}
