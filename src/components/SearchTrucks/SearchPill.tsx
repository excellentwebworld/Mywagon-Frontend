import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import { useTranslation } from '../../hooks/useTranslation';
import type { SearchCriteria } from '../../pages/SearchTrucks/types';
import { formatDisplayDate } from '../../utils/dateDisplay';
import { DatePicker, getTodayDateString } from '../ui/DatePicker';
import {
  SearchPlaceSuggestions,
  type PlaceSuggestion,
} from './SearchPlaceSuggestions';
import { SearchVehicleCargoPicker } from './SearchVehicleCargoPicker';
import { usePlaceSuggestions } from './usePlaceSuggestions';

type SegmentKey = 'pickupCity' | 'pickupDate' | 'vehicle' | 'dropoffCity';

interface SearchPillProps {
  criteria: SearchCriteria;
  onChange: (next: SearchCriteria) => void;
  onSearch: () => boolean;
  searchPending?: boolean;
  t: (key: string) => string;
}

export const SearchPill: React.FC<SearchPillProps> = ({
  criteria,
  onChange,
  onSearch,
  searchPending = false,
  t,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [activeSeg, setActiveSeg] = useState<SegmentKey | null>(null);
  const [activeSuggestIdx, setActiveSuggestIdx] = useState(-1);
  const panelRef = useRef<HTMLDivElement>(null);
  const pickupRef = useRef<HTMLInputElement>(null);
  const dropoffRef = useRef<HTMLInputElement>(null);
  const pickupSegRef = useRef<HTMLDivElement>(null);
  const dropoffSegRef = useRef<HTMLDivElement>(null);
  const vehicleSegRef = useRef<HTMLDivElement>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
  const { vehicleTypes, loading: vehicleTypesLoading } = useVehicleTypes();
  const { lang } = useTranslation();
  const todayStr = useMemo(() => getTodayDateString(), []);

  const cityFieldActive = activeSeg === 'pickupCity' || activeSeg === 'dropoffCity';
  const cityQuery =
    activeSeg === 'pickupCity'
      ? criteria.pickupCity
      : activeSeg === 'dropoffCity'
        ? criteria.dropoffCity
        : '';

  const { suggestions, loading: suggestLoading, resolvePlace, clearSuggestions } =
    usePlaceSuggestions({
      apiKey,
      query: cityQuery,
      enabled: expanded && cityFieldActive,
      language: lang,
    });

  const openSeg = (seg: SegmentKey) => {
    setExpanded(true);
    setActiveSeg(seg);
    setActiveSuggestIdx(-1);
  };

  const collapse = () => {
    setExpanded(false);
    setActiveSeg(null);
    setActiveSuggestIdx(-1);
    clearSuggestions();
  };

  useEffect(() => {
    if (!expanded) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      collapse();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapse();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded || !activeSeg) return;
    const id = window.setTimeout(() => {
      if (activeSeg === 'pickupCity') pickupRef.current?.focus();
      else if (activeSeg === 'dropoffCity') dropoffRef.current?.focus();
    }, 40);
    return () => window.clearTimeout(id);
  }, [expanded, activeSeg]);

  useEffect(() => {
    setActiveSuggestIdx(-1);
  }, [suggestions, activeSeg]);

  const applyPlace = async (field: 'pickup' | 'dropoff', suggestion: PlaceSuggestion) => {
    const place = await resolvePlace(suggestion);
    if (field === 'pickup') {
      onChange({
        ...criteria,
        pickupCity: place.city,
        pickupLat: place.lat,
        pickupLng: place.lng,
        pickupRadius: criteria.pickupRadius ?? 50,
      });
    } else {
      onChange({
        ...criteria,
        dropoffCity: place.city,
        dropoffLat: place.lat,
        dropoffLng: place.lng,
        dropoffRadius: criteria.dropoffRadius ?? 50,
      });
    }
    clearSuggestions();
    setActiveSuggestIdx(-1);
    setActiveSeg(field === 'pickup' ? 'pickupDate' : null);
  };

  const handleCityKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'pickup' | 'dropoff'
  ) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeSuggestIdx >= 0) {
      e.preventDefault();
      void applyPlace(field, suggestions[activeSuggestIdx]);
    }
  };

  const handleSearch = () => {
    if (onSearch()) collapse();
  };

  const vehicleLabel = useMemo(() => {
    const selectedIds =
      criteria.truckTypeIds.length > 0
        ? criteria.truckTypeIds
        : Object.keys(criteria.vehicleSpecs || {})
            .filter((k) => (criteria.vehicleSpecs[k]?.length ?? 0) > 0)
            .map(Number);
    if (selectedIds.length === 0) {
      return criteria.vehicleType || t('satPillVehiclePh');
    }
    const names = selectedIds
      .map((id) => {
        const vt = vehicleTypes.find((x) => x.formKey === String(id));
        if (!vt) return null;
        return lang === 'el' ? vt.nameEl : vt.name;
      })
      .filter(Boolean) as string[];
    if (names.length === 0) return t('satPillVehiclePh');
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  }, [
    criteria.truckTypeIds,
    criteria.vehicleSpecs,
    criteria.vehicleType,
    vehicleTypes,
    lang,
    t,
  ]);

  const segClass = (key: SegmentKey) =>
    `sat-pill-seg ${activeSeg === key ? 'active' : ''}${expanded ? ' sat-pill-seg--edit' : ''}`;

  const showSuggestions =
    expanded &&
    cityFieldActive &&
    (suggestLoading || suggestions.length > 0) &&
    cityQuery.trim().length >= 2;

  let suggestStyle: React.CSSProperties | undefined;
  if (showSuggestions && panelRef.current) {
    const wrap = panelRef.current.getBoundingClientRect();
    const segEl =
      activeSeg === 'pickupCity'
        ? pickupSegRef.current
        : activeSeg === 'dropoffCity'
          ? dropoffSegRef.current
          : null;
    if (segEl) {
      const seg = segEl.getBoundingClientRect();
      const width = Math.min(380, Math.max(280, seg.width + 48));
      let left = seg.left - wrap.left;
      left = Math.max(0, Math.min(left, wrap.width - width));
      suggestStyle = { left, width };
    }
  }

  return (
    <div className={`sat-pill-wrap ${expanded ? 'is-expanded' : ''}`} ref={panelRef}>
      <div
        className={`sat-pill ${expanded ? 'expanded' : ''}`}
        role="search"
        onClick={() => {
          if (!expanded) openSeg('pickupCity');
        }}
      >
        {!expanded ? (
          <>
            <button type="button" className="sat-pill-seg" onClick={(e) => { e.stopPropagation(); openSeg('pickupCity'); }}>
              <span className="sat-pill-label">{t('satPillPickupCity')}</span>
              <span className="sat-pill-value">
                {criteria.pickupCity || t('satPillPickupCityPh')}
              </span>
            </button>
            <span className="sat-pill-divider" />
            <button type="button" className="sat-pill-seg" onClick={(e) => { e.stopPropagation(); openSeg('pickupDate'); }}>
              <span className="sat-pill-label">{t('satPillPickupDate')}</span>
              <span className="sat-pill-value">
                {criteria.pickupDate
                  ? formatDisplayDate(criteria.pickupDate)
                  : t('satPillPickupDatePh')}
              </span>
            </button>
            <span className="sat-pill-divider" />
            <button type="button" className="sat-pill-seg" onClick={(e) => { e.stopPropagation(); openSeg('vehicle'); }}>
              <span className="sat-pill-label">{t('satPillVehicle')}</span>
              <span className="sat-pill-value">{vehicleLabel}</span>
            </button>
          </>
        ) : (
          <>
            <div
              ref={pickupSegRef}
              className={segClass('pickupCity')}
              onClick={(e) => { e.stopPropagation(); setActiveSeg('pickupCity'); }}
            >
              <span className="sat-pill-label">{t('satPillPickupCity')} *</span>
              <div className="sat-pill-city-row">
                <input
                  ref={pickupRef}
                  type="text"
                  className="sat-pill-input"
                  value={criteria.pickupCity}
                  onChange={(e) =>
                    onChange({
                      ...criteria,
                      pickupCity: e.target.value,
                      pickupLat: null,
                      pickupLng: null,
                    })
                  }
                  onFocus={() => setActiveSeg('pickupCity')}
                  onKeyDown={(e) => handleCityKeyDown(e, 'pickup')}
                  placeholder={t('satPillPickupCityPh')}
                  autoComplete="off"
                />
                {criteria.pickupCity ? (
                  <button
                    type="button"
                    className="sat-pill-clear"
                    aria-label={t('clear') || 'Clear'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...criteria,
                        pickupCity: '',
                        pickupLat: null,
                        pickupLng: null,
                      });
                      pickupRef.current?.focus();
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
            <span className="sat-pill-divider" />
            <div
              className={segClass('pickupDate')}
              onClick={(e) => { e.stopPropagation(); setActiveSeg('pickupDate'); }}
            >
              <span className="sat-pill-label">{t('satPillPickupDate')} *</span>
              <DatePicker
                className="sat-pill-date-picker"
                value={criteria.pickupDate}
                onChange={(val) => {
                  setActiveSeg('pickupDate');
                  const next = { ...criteria, pickupDate: val };
                  if (criteria.dropoffDate && val && criteria.dropoffDate < val) {
                    next.dropoffDate = '';
                  }
                  onChange(next);
                }}
                placeholder={t('satPillPickupDatePh')}
                min={todayStr}
                direction="auto"
              />
            </div>
            <span className="sat-pill-divider" />
            <div
              ref={vehicleSegRef}
              className={segClass('vehicle')}
              onClick={(e) => {
                e.stopPropagation();
                setActiveSeg('vehicle');
              }}
            >
              <span className="sat-pill-label">{t('satPillVehicle')} *</span>
              <span className="sat-pill-value sat-pill-value--filled">{vehicleLabel}</span>
            </div>
            <span className="sat-pill-divider" />
            <div
              ref={dropoffSegRef}
              className={segClass('dropoffCity')}
              onClick={(e) => { e.stopPropagation(); setActiveSeg('dropoffCity'); }}
            >
              <span className="sat-pill-label">{t('satPillDropoff')}</span>
              <div className="sat-pill-city-row">
                <input
                  ref={dropoffRef}
                  type="text"
                  className="sat-pill-input"
                  value={criteria.dropoffCity}
                  onChange={(e) =>
                    onChange({
                      ...criteria,
                      dropoffCity: e.target.value,
                      dropoffLat: null,
                      dropoffLng: null,
                    })
                  }
                  onFocus={() => setActiveSeg('dropoffCity')}
                  onKeyDown={(e) => handleCityKeyDown(e, 'dropoff')}
                  placeholder={t('satPillDropoffPh')}
                  autoComplete="off"
                />
                {criteria.dropoffCity ? (
                  <button
                    type="button"
                    className="sat-pill-clear"
                    aria-label={t('clear') || 'Clear'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange({
                        ...criteria,
                        dropoffCity: '',
                        dropoffLat: null,
                        dropoffLng: null,
                      });
                      dropoffRef.current?.focus();
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          </>
        )}

        <button
          type="button"
          className={`sat-pill-search ${expanded ? 'sat-pill-search--wide' : ''}${searchPending ? ' sat-pill-search--pending' : ''}`}
          aria-label={t('satSearch')}
          onClick={(e) => {
            e.stopPropagation();
            if (expanded) handleSearch();
            else openSeg('pickupCity');
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          {expanded && <span className="sat-pill-search-label">{t('satSearch')}</span>}
        </button>
      </div>

      {showSuggestions && (
        <SearchPlaceSuggestions
          suggestions={suggestions}
          loading={suggestLoading}
          activeIndex={activeSuggestIdx}
          onHoverIndex={setActiveSuggestIdx}
          emptyLabel={t('satSuggestLoading') || 'Searching…'}
          style={suggestStyle}
          onSelect={(s) => {
            void applyPlace(activeSeg === 'dropoffCity' ? 'dropoff' : 'pickup', s);
          }}
        />
      )}

      {expanded && activeSeg === 'vehicle' && (
        <div
          className="sat-pill-popover sat-pill-popover--vehicle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sat-pill-popover-title">{t('satPillVehicle')} *</div>
          {vehicleTypesLoading ? (
            <div className="sat-muted">{t('satLoadingVehicleTypes')}</div>
          ) : (
            <SearchVehicleCargoPicker
              vehicleSpecs={criteria.vehicleSpecs || {}}
              truckTypeIds={criteria.truckTypeIds}
              onChange={(next) => onChange({ ...criteria, ...next })}
              t={t}
            />
          )}
        </div>
      )}
    </div>
  );
};
