import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadGoogleMaps } from '../AddressBook/GoogleMapAddressField';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import { useTranslation } from '../../hooks/useTranslation';
import type { SearchCriteria } from '../../pages/SearchTrucks/types';

interface SearchPillProps {
  criteria: SearchCriteria;
  onChange: (next: SearchCriteria) => void;
  onSearch: () => boolean;
  t: (key: string) => string;
}

export const SearchPill: React.FC<SearchPillProps> = ({ criteria, onChange, onSearch, t }) => {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropoffRef = useRef<HTMLInputElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const { vehicleTypes, loading: vehicleTypesLoading } = useVehicleTypes();
  const { lang } = useTranslation();

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
          field: 'pickup' | 'dropoff'
        ) => {
          if (!input) return;
          const ac = new window.google!.maps.places.Autocomplete(input, {
            fields: ['formatted_address', 'name', 'address_components', 'geometry'],
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
            const lat = place.geometry?.location?.lat?.();
            const lng = place.geometry?.location?.lng?.();
            if (field === 'pickup') {
              onChange({
                ...criteriaRef.current,
                pickupCity: city,
                pickupLat: lat ?? null,
                pickupLng: lng ?? null,
                pickupRadius: criteriaRef.current.pickupRadius ?? 50,
              });
            } else {
              onChange({
                ...criteriaRef.current,
                dropoffCity: city,
                dropoffLat: lat ?? null,
                dropoffLng: lng ?? null,
                dropoffRadius: criteriaRef.current.dropoffRadius ?? 50,
              });
            }
          });
        };
        bind(pickupRef.current, 'pickup');
        bind(dropoffRef.current, 'dropoff');
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [expanded, apiKey, onChange]);

  const handleSearch = () => {
    if (onSearch()) setExpanded(false);
  };

  const vehicleLabel = useMemo(() => {
    if (criteria.truckTypeIds.length === 0) {
      return criteria.vehicleType || t('satPillVehiclePh');
    }
    const names = criteria.truckTypeIds
      .map((id) => {
        const vt = vehicleTypes.find((x) => x.formKey === String(id));
        if (!vt) return null;
        return lang === 'el' ? vt.nameEl : vt.name;
      })
      .filter(Boolean) as string[];
    if (names.length === 0) return t('satPillVehiclePh');
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  }, [criteria.truckTypeIds, criteria.vehicleType, vehicleTypes, lang, t]);

  const toggleType = (id: number) => {
    const has = criteria.truckTypeIds.includes(id);
    const truckTypeIds = has
      ? criteria.truckTypeIds.filter((x) => x !== id)
      : [...criteria.truckTypeIds, id];
    const first = vehicleTypes.find((x) => x.formKey === String(truckTypeIds[0]));
    const vehicleType = first ? (lang === 'el' ? first.nameEl : first.name) : '';
    onChange({ ...criteria, truckTypeIds, vehicleType });
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
          <span className="sat-pill-value">{vehicleLabel}</span>
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
                onChange={(e) =>
                  onChange({
                    ...criteria,
                    pickupCity: e.target.value,
                    pickupLat: null,
                    pickupLng: null,
                  })
                }
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
                onChange={(e) =>
                  onChange({
                    ...criteria,
                    dropoffCity: e.target.value,
                    dropoffLat: null,
                    dropoffLng: null,
                  })
                }
                placeholder={t('satPillDropoffPh')}
                autoComplete="off"
              />
            </div>
            <div className="sat-field sat-field--types">
              <label>{t('satPillVehicle')} *</label>
              {vehicleTypesLoading ? (
                <div className="sat-muted">{t('satLoadingVehicleTypes')}</div>
              ) : (
                <div className="sat-type-checks">
                  {vehicleTypes.map((vt) => {
                    const id = Number(vt.formKey);
                    const checked = criteria.truckTypeIds.includes(id);
                    const label = lang === 'el' ? vt.nameEl : vt.name;
                    return (
                      <label key={vt.formKey} className="sat-type-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleType(id)}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
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
