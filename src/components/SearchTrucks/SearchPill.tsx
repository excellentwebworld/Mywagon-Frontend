import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import type { SearchCriteria } from '../../pages/SearchTrucks/types';

interface SearchPillProps {
  criteria: SearchCriteria;
  onChange: (next: SearchCriteria) => void;
  onSearch: () => boolean;
  t: (key: string) => string;
}

const VEHICLE_OPTIONS = [
  'Semi-Trailer',
  'Box Truck',
  'Curtainside',
  'Refrigerated',
  'Flatbed',
  'Tail lift',
];

export const SearchPill: React.FC<SearchPillProps> = ({ criteria, onChange, onSearch, t }) => {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropoffRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [expanded]);

  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;

  useEffect(() => {
    if (!expanded || !apiKey) return;
    let disposed = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (disposed || !window.google?.maps?.places) return;
        const bind = (
          input: HTMLInputElement | null,
          field: 'pickupCity' | 'dropoffCity'
        ) => {
          if (!input) return;
          const ac = new window.google!.maps.places.Autocomplete(input, {
            fields: ['formatted_address', 'name', 'address_components'],
            componentRestrictions: { country: 'gr' },
          });
          ac.addListener('place_changed', () => {
            const place = ac.getPlace();
            const city =
              place.address_components?.find((c: { types: string[]; long_name: string }) =>
                c.types.includes('locality')
              )?.long_name ||
              place.name ||
              place.formatted_address ||
              '';
            onChange({ ...criteriaRef.current, [field]: city });
          });
        };
        bind(pickupRef.current, 'pickupCity');
        bind(dropoffRef.current, 'dropoffCity');
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [expanded, apiKey, onChange]);

  const handleSearch = () => {
    if (onSearch()) setExpanded(false);
  };

  return (
    <div className="sat-pill-wrap" ref={panelRef}>
      <div
        className={`sat-pill ${expanded ? 'expanded' : ''}`}
        role="search"
        onClick={() => !expanded && setExpanded(true)}
      >
        <button
          type="button"
          className="sat-pill-seg"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <span className="sat-pill-label">{t('satPillPickupCity')}</span>
          <span className="sat-pill-value">
            {criteria.pickupCity || t('satPillPickupCityPh')}
          </span>
        </button>
        <span className="sat-pill-divider" />
        <button
          type="button"
          className="sat-pill-seg"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <span className="sat-pill-label">{t('satPillPickupDate')}</span>
          <span className="sat-pill-value">
            {criteria.pickupDate || t('satPillPickupDatePh')}
          </span>
        </button>
        <span className="sat-pill-divider" />
        <button
          type="button"
          className="sat-pill-seg"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <span className="sat-pill-label">{t('satPillVehicle')}</span>
          <span className="sat-pill-value">
            {criteria.vehicleType || t('satPillVehiclePh')}
          </span>
        </button>
        <button
          type="button"
          className="sat-pill-search"
          aria-label={t('satSearch')}
          onClick={(e) => {
            e.stopPropagation();
            if (expanded) handleSearch();
            else setExpanded(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="sat-pill-panel">
          <div className="sat-pill-grid">
            <div className="sat-field">
              <label>{t('satPillPickupCity')} *</label>
              <input
                ref={pickupRef}
                type="text"
                value={criteria.pickupCity}
                onChange={(e) => onChange({ ...criteria, pickupCity: e.target.value })}
                placeholder={t('satPillPickupCityPh')}
                autoComplete="off"
              />
            </div>
            <div className="sat-field">
              <label>{t('satPillPickupDate')} *</label>
              <input
                type="date"
                value={criteria.pickupDate}
                onChange={(e) => onChange({ ...criteria, pickupDate: e.target.value })}
              />
            </div>
            <div className="sat-field">
              <label>{t('satPillDropoff')}</label>
              <input
                ref={dropoffRef}
                type="text"
                value={criteria.dropoffCity}
                onChange={(e) => onChange({ ...criteria, dropoffCity: e.target.value })}
                placeholder={t('satPillDropoffPh')}
                autoComplete="off"
              />
            </div>
            <div className="sat-field">
              <label>{t('satPillVehicle')} *</label>
              <select
                value={criteria.vehicleType}
                onChange={(e) => onChange({ ...criteria, vehicleType: e.target.value })}
              >
                <option value="">{t('satPillVehiclePh')}</option>
                {VEHICLE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="sat-pill-panel-ft">
            <button type="button" className="sat-btn" onClick={() => setExpanded(false)}>
              {t('cancel')}
            </button>
            <button type="button" className="sat-btn sat-btn-pr" onClick={handleSearch}>
              {t('satSearch')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
