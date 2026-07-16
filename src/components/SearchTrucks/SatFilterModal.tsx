import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { partnersService } from '../../api';
import { useTranslation } from '../../hooks/useTranslation';
import { useVehicleTypes } from '../../hooks/useVehicleTypes';
import type { QuickFilterKey, TripFilter } from '../../pages/SearchTrucks/types';
import { DatePicker } from '../ui/DatePicker';
import { SearchPlaceSuggestions, type PlaceSuggestion } from './SearchPlaceSuggestions';
import { usePlaceSuggestions } from './usePlaceSuggestions';

export interface SatFilterDraft {
  truckTypeIds: number[];
  availableFromStart: string;
  availableFromEnd: string;
  pickupCity: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupRadius: number;
  dropoffCity: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffRadius: number;
  stopsMulti: boolean;
  stopsDirect: boolean;
  providerNames: string[];
  minPrice: string;
  maxPrice: string;
  quickFilters: QuickFilterKey[];
}

interface SatFilterModalProps {
  open: boolean;
  draft: SatFilterDraft;
  onClose: () => void;
  onApply: (next: SatFilterDraft) => void;
  onReset: () => void;
  t: (key: string) => string;
}

function resolveTripType(multi: boolean, direct: boolean): TripFilter {
  if (multi && !direct) return 'multi_stop';
  if (direct && !multi) return 'direct';
  return 'any';
}

export function tripTypeToStops(tripType?: TripFilter): { stopsMulti: boolean; stopsDirect: boolean } {
  if (tripType === 'multi_stop') return { stopsMulti: true, stopsDirect: false };
  if (tripType === 'direct') return { stopsMulti: false, stopsDirect: true };
  return { stopsMulti: true, stopsDirect: false };
}

function SatRadiusField({
  id,
  label,
  value,
  onChange,
  kmsLabel,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  kmsLabel: string;
}) {
  const pct = Math.round(((value - 0) / 300) * 100);
  return (
    <div className="sat-filter-radius">
      <p className="sat-filter-radius__label">{label}</p>
      <div className="sat-filter-radius__wrap">
        <div className="sat-filter-radius__value" style={{ left: `calc(${pct}% - 18px)` }}>
          {value} {kmsLabel}
        </div>
        <input
          id={id}
          className="sat-filter-radius__input"
          type="range"
          min={0}
          max={300}
          step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

export const SatFilterModal: React.FC<SatFilterModalProps> = ({
  open,
  draft: initial,
  onClose,
  onApply,
  onReset,
  t,
}) => {
  const [draft, setDraft] = useState<SatFilterDraft>(initial);
  const [pickupSuggestOpen, setPickupSuggestOpen] = useState(false);
  const [dropoffSuggestOpen, setDropoffSuggestOpen] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');
  const { vehicleTypes, loading: vehicleTypesLoading } = useVehicleTypes();
  const { lang } = useTranslation();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;

  const pickupPlaces = usePlaceSuggestions({
    apiKey,
    query: draft.pickupCity,
    enabled: open && pickupSuggestOpen,
    language: lang,
  });

  const dropoffPlaces = usePlaceSuggestions({
    apiKey,
    query: draft.dropoffCity,
    enabled: open && dropoffSuggestOpen,
    language: lang,
  });

  const partnersQuery = useQuery({
    queryKey: ['sat-filter-partners', providerQuery],
    queryFn: () =>
      partnersService.listPartners({
        page: 1,
        per_page: 50,
        search: providerQuery.trim() || undefined,
        facet: 'all',
        statuses: ['active'],
      }),
    enabled: open,
    staleTime: 60_000,
  });

  const partnerOptions = useMemo(
    () =>
      (partnersQuery.data?.items ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [partnersQuery.data?.items]
  );

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const toggleTruckType = (id: number) => {
    setDraft((prev) => {
      const has = prev.truckTypeIds.includes(id);
      return {
        ...prev,
        truckTypeIds: has
          ? prev.truckTypeIds.filter((x) => x !== id)
          : [...prev.truckTypeIds, id],
      };
    });
  };

  const applyPlace = useCallback(
    async (field: 'pickup' | 'dropoff', suggestion: PlaceSuggestion) => {
      const resolve =
        field === 'pickup' ? pickupPlaces.resolvePlace : dropoffPlaces.resolvePlace;
      const place = await resolve(suggestion);
      if (field === 'pickup') {
        setDraft((p) => ({
          ...p,
          pickupCity: place.city || place.label,
          pickupLat: place.lat,
          pickupLng: place.lng,
        }));
        setPickupSuggestOpen(false);
        pickupPlaces.clearSuggestions();
      } else {
        setDraft((p) => ({
          ...p,
          dropoffCity: place.city || place.label,
          dropoffLat: place.lat,
          dropoffLng: place.lng,
        }));
        setDropoffSuggestOpen(false);
        dropoffPlaces.clearSuggestions();
      }
    },
    [dropoffPlaces, pickupPlaces]
  );

  const toggleProvider = (name: string) => {
    setDraft((prev) => {
      const has = prev.providerNames.includes(name);
      return {
        ...prev,
        providerNames: has
          ? prev.providerNames.filter((n) => n !== name)
          : [...prev.providerNames, name],
      };
    });
  };

  if (!open) return null;

  const kmsLabel = t('satKms') || 'kms';

  return createPortal(
    <div
      className="sat-pop-bg open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="sat-pop sat-pop--filter sat-pop--filter-laravel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sat-filter-title"
      >
        <div className="sat-pop-h">
          <div>
            <h3 id="sat-filter-title">{t('satFilter') || 'Filter'}</h3>
          </div>
          <button type="button" className="sat-pop-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="sat-pop-body sat-pop-body--filter-laravel">
          <section className="sat-filter-sec">
            <h4 className="sat-filter-sec-title">{t('satFilterTruckType') || 'Truck Type'}</h4>
            {vehicleTypesLoading ? (
              <div className="sat-muted">{t('satLoadingVehicleTypes')}</div>
            ) : (
              <div className="sat-filter-trucks" role="list">
                {vehicleTypes.map((vt) => {
                  const id = Number(vt.formKey);
                  const selected = draft.truckTypeIds.includes(id);
                  const label = lang === 'el' ? vt.nameEl : vt.name;
                  return (
                    <button
                      key={vt.formKey}
                      type="button"
                      role="listitem"
                      className={`sat-filter-truck-card${selected ? ' act' : ''}`}
                      onClick={() => toggleTruckType(id)}
                      aria-pressed={selected}
                    >
                      {vt.image ? (
                        <img src={vt.image} alt="" className="sat-filter-truck-card__img" />
                      ) : (
                        <span className="sat-filter-truck-card__icon" aria-hidden>
                          🚛
                        </span>
                      )}
                      <span className="sat-filter-truck-card__label">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="sat-filter-sec">
            <h4 className="sat-filter-sec-title">{t('satFilterAvailableFrom') || 'Available From'}</h4>
            <div className="sat-filter-date-grid">
              <div className="sat-pop-field">
                <label className="sat-pop-label" htmlFor="sat-filter-start">
                  {t('satFilterStartDate') || 'Start Date'}
                </label>
                <DatePicker
                  value={draft.availableFromStart}
                  onChange={(v) => setDraft((p) => ({ ...p, availableFromStart: v }))}
                  placeholder={t('satDatePlaceholder') || 'Month, DD, YYYY'}
                />
              </div>
              <div className="sat-pop-field">
                <label className="sat-pop-label" htmlFor="sat-filter-end">
                  {t('satFilterEndDate') || 'End Date'}
                </label>
                <DatePicker
                  value={draft.availableFromEnd}
                  onChange={(v) => setDraft((p) => ({ ...p, availableFromEnd: v }))}
                  placeholder={t('satDatePlaceholder') || 'Month, DD, YYYY'}
                />
              </div>
            </div>
          </section>

          <section className="sat-filter-sec">
            <div className="sat-pop-field sat-filter-loc">
              <label className="sat-pop-label" htmlFor="sat-filter-pickup">
                {t('satFilterPickupLocation') || 'Pickup Location'}
              </label>
              <input
                id="sat-filter-pickup"
                className="sat-filter-input"
                type="text"
                placeholder={t('satSearch') || 'Search'}
                value={draft.pickupCity}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, pickupCity: e.target.value }));
                  setPickupSuggestOpen(true);
                }}
                onFocus={() => setPickupSuggestOpen(true)}
                autoComplete="off"
              />
              {pickupSuggestOpen && draft.pickupCity.trim() ? (
                <SearchPlaceSuggestions
                  suggestions={pickupPlaces.suggestions}
                  loading={pickupPlaces.loading}
                  activeIndex={-1}
                  onSelect={(s) => void applyPlace('pickup', s)}
                />
              ) : null}
            </div>
            <SatRadiusField
              id="sat-filter-pickup-radius"
              label={t('satFilterRadiusSource') || 'Radius around the source location*'}
              value={draft.pickupRadius}
              onChange={(n) => setDraft((p) => ({ ...p, pickupRadius: n }))}
              kmsLabel={kmsLabel}
            />
          </section>

          <section className="sat-filter-sec">
            <div className="sat-pop-field sat-filter-loc">
              <label className="sat-pop-label" htmlFor="sat-filter-dropoff">
                {t('satFilterDropoffLocation') || 'Drop-off Location'}
              </label>
              <input
                id="sat-filter-dropoff"
                className="sat-filter-input"
                type="text"
                placeholder={t('satSearch') || 'Search'}
                value={draft.dropoffCity}
                onChange={(e) => {
                  setDraft((p) => ({ ...p, dropoffCity: e.target.value }));
                  setDropoffSuggestOpen(true);
                }}
                onFocus={() => setDropoffSuggestOpen(true)}
                autoComplete="off"
              />
              {dropoffSuggestOpen && draft.dropoffCity.trim() ? (
                <SearchPlaceSuggestions
                  suggestions={dropoffPlaces.suggestions}
                  loading={dropoffPlaces.loading}
                  activeIndex={-1}
                  onSelect={(s) => void applyPlace('dropoff', s)}
                />
              ) : null}
            </div>
            <SatRadiusField
              id="sat-filter-dropoff-radius"
              label={t('satFilterRadiusSource') || 'Radius around the source location*'}
              value={draft.dropoffRadius}
              onChange={(n) => setDraft((p) => ({ ...p, dropoffRadius: n }))}
              kmsLabel={kmsLabel}
            />
          </section>

          <section className="sat-filter-sec">
            <h4 className="sat-filter-sec-title">{t('satFilterStops') || 'Stops'}</h4>
            <div className="sat-filter-stops">
              <label className="sat-filter-stop">
                <input
                  type="checkbox"
                  checked={draft.stopsMulti}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, stopsMulti: e.target.checked }))
                  }
                />
                <span>{t('satTripMulti') || 'Multi Stops'}</span>
              </label>
              <label className="sat-filter-stop">
                <input
                  type="checkbox"
                  checked={draft.stopsDirect}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, stopsDirect: e.target.checked }))
                  }
                />
                <span>{t('satTripDirect') || 'Direct Route'}</span>
              </label>
            </div>
          </section>

          <section className="sat-filter-sec">
            <h4 className="sat-filter-sec-title">
              {t('satFilterCarrierDriver') || 'Carrier/Driver Info'}
            </h4>
            <input
              className="sat-filter-input"
              type="text"
              placeholder={t('satSearch') || 'Search'}
              value={providerQuery}
              onChange={(e) => setProviderQuery(e.target.value)}
            />
            <div className="sat-filter-provider-chips">
              {draft.providerNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="sat-filter-provider-chip act"
                  onClick={() => toggleProvider(name)}
                >
                  {name} ✕
                </button>
              ))}
            </div>
            {partnerOptions.length > 0 ? (
              <div className="sat-filter-provider-list">
                {partnerOptions
                  .filter((p) => !draft.providerNames.includes(p.name))
                  .slice(0, 8)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="sat-filter-provider-opt"
                      onClick={() => toggleProvider(p.name)}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            ) : null}
          </section>

          <section className="sat-filter-sec">
            <h4 className="sat-filter-sec-title">{t('satFilterPrice') || 'Price'}</h4>
            <div className="sat-filter-date-grid">
              <div className="sat-pop-field">
                <label className="sat-pop-label" htmlFor="sat-filter-min-price">
                  {t('satFilterMinPrice') || 'Min Price'}
                </label>
                <div className="sat-filter-price-wrap">
                  <input
                    id="sat-filter-min-price"
                    className="sat-filter-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={t('satFilterMinPrice') || 'Min Price'}
                    value={draft.minPrice}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        minPrice: e.target.value.replace(/[^0-9.]/g, ''),
                      }))
                    }
                  />
                  <span className="sat-filter-price-currency">€</span>
                </div>
              </div>
              <div className="sat-pop-field">
                <label className="sat-pop-label" htmlFor="sat-filter-max-price">
                  {t('satFilterMaxPrice') || 'Max Price'}
                </label>
                <div className="sat-filter-price-wrap">
                  <input
                    id="sat-filter-max-price"
                    className="sat-filter-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={t('satFilterMaxPrice') || 'Max Price'}
                    value={draft.maxPrice}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        maxPrice: e.target.value.replace(/[^0-9.]/g, ''),
                      }))
                    }
                  />
                  <span className="sat-filter-price-currency">€</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="sat-pop-ft">
          <button
            type="button"
            className="sat-btn"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            {t('satFilterReset') || 'Reset'}
          </button>
          <div className="sat-pop-ft-actions">
            <button type="button" className="sat-btn" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="sat-btn sat-btn-pr"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              {t('satFilterApply') || 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export { resolveTripType };
