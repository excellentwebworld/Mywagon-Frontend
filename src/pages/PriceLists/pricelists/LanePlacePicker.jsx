import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { GoogleMapAddressField } from '../../../components/AddressBook/GoogleMapAddressField';
import {
  isCityOnlyLaneStop,
  isDisplayableLaneStop,
  isLegacyLaneStop,
  isValidLaneStop,
  mapGooglePlaceToLaneStop,
} from './mapGooglePlaceToLaneStop';

/** Prefer addresses/places worldwide — no country restriction (PDS-935). */
const LANE_AUTOCOMPLETE_OPTIONS = {
  types: ['geocode', 'establishment'],
};

function stopSummaryLines(stop) {
  const label = String(stop?.label || '').trim();
  const address = String(stop?.address || '').trim();
  const city = String(stop?.city || stop?.value || '').trim();
  const primary = label || address || city;
  const secondary = address && address !== label ? address : (city && city !== primary ? city : '');
  return { primary, secondary };
}

function stopIdentityKey(stop) {
  if (!stop) return '';
  return [
    stop.city,
    stop.value,
    stop.label,
    stop.address,
    stop.lat,
    stop.lng,
    stop.place_id,
  ].map((v) => String(v ?? '')).join('|');
}

/**
 * Google Places picker for a single lane stop (origin, destination, or intermediate).
 */
export default function LanePlacePicker({ value, onChange, invalid = false, label }) {
  const { t } = useTranslation();
  const { T } = useTheme();
  const inputId = useId().replace(/:/g, '');
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const displayable = isDisplayableLaneStop(value);
  const pinned = isValidLaneStop(value);
  const legacy = isLegacyLaneStop(value);
  const cityOnly = isCityOnlyLaneStop(value);
  const showSearch = legacy || !displayable || isEditing;

  const valueKey = stopIdentityKey(value);

  useEffect(() => {
    if (displayable) {
      setIsEditing(false);
      setDraft('');
    } else {
      setIsEditing(true);
      setDraft('');
    }
  }, [valueKey, displayable]);

  const handleAddressChange = useCallback((text) => {
    setDraft(text);
    if (pinned || legacy) {
      onChange?.(null);
    }
  }, [pinned, legacy, onChange]);

  const handlePlaceSelected = useCallback((details) => {
    const stop = mapGooglePlaceToLaneStop(details, { place_id: details.place_id });
    if (!stop) return;
    setDraft('');
    setIsEditing(false);
    onChange?.(stop);
  }, [onChange]);

  const handleChangeLocation = useCallback(() => {
    setIsEditing(true);
    setDraft(displayable ? (value?.label || value?.city || value?.value || '') : '');
    if (pinned || legacy) {
      onChange?.(null);
    }
  }, [displayable, pinned, legacy, value, onChange]);

  const validationError = invalid && showSearch
    ? (draft.trim() && !displayable
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
  const summary = displayable && !isEditing ? stopSummaryLines(value) : null;

  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      {summary && (
        <div
          className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg"
          style={{
            background: T.sa,
            border: `1px solid ${invalid ? '#EF4444' : T.bd}`,
            fontSize: 12,
            color: T.t2,
          }}
        >
          <div className="min-w-0 flex-1">
            <div style={{ fontWeight: 600, color: T.t1, lineHeight: 1.4 }}>{summary.primary}</div>
            {summary.secondary && (
              <div style={{ marginTop: 2, color: T.t3, fontSize: 11, lineHeight: 1.35 }}>{summary.secondary}</div>
            )}
          </div>
          <button
            type="button"
            onClick={handleChangeLocation}
            className="shrink-0 border-none bg-transparent cursor-pointer p-0"
            style={{ color: T.ac, fontSize: 11, fontWeight: 600 }}
          >
            {t('common.change', 'Change')}
          </button>
        </div>
      )}
      {showSearch && (
        <div
          className="lane-place-picker"
          style={{
            '--ab-border': invalid ? '#EF4444' : T.bd,
            marginTop: summary ? 8 : 0,
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
      )}
      {cityOnly && !isEditing && (
        <div style={{ fontSize: 10, color: T.t3, marginTop: 4 }}>
          {t(
            'priceLists.modal.cityOnlyStopHint',
            'Optional: click Change to pin the exact location on the map.',
          )}
        </div>
      )}
      {legacy && (
        <div style={{ fontSize: 10, color: '#D97706', marginTop: 4 }}>
          {t('priceLists.modal.legacyStopHint', 'Previously: {{label}}. Re-select using address search.', {
            label: value.label || value.city || value.value || '—',
          })}
        </div>
      )}
    </div>
  );
}
