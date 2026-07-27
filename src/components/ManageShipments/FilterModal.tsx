import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { productMasterService } from '../../api/services/productMasterService';
import { mapReferenceToProductTypes } from '../../api/mappers/productMasterMapper';
import {
  DEFAULT_FILTERS,
  validateFilterRanges,
  type ShipmentsFilterState,
} from '../../pages/ManageShipments/utils/listingUtils';
import { DatePicker, getTodayDateString } from '../ui/DatePicker';
import { SearchableSelect } from '../ui/SearchableSelect';
import { TimePicker } from '../ui/TimePicker';
import { FilterLocationField } from './FilterLocationField';

interface FilterModalProps {
  open: boolean;
  filters: ShipmentsFilterState;
  transporterOptions?: string[];
  customerOptions?: string[];
  onClose: () => void;
  onApply: (filters: ShipmentsFilterState, productTypeNames: Record<string, string>) => boolean;
  t: (key: string) => string;
}

function splitDateTimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [datePart, timePart = ''] = value.split('T');
  return {
    date: datePart || '',
    time: timePart.slice(0, 5),
  };
}

function joinDateTimeLocal(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

function FilterDateTimeField({
  id,
  label,
  value,
  onChange,
  minDate,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  minDate?: string;
}) {
  const { date, time } = splitDateTimeLocal(value);

  return (
    <div className="mgmt-pop-field">
      <label className="mgmt-pop-label" htmlFor={id}>
        {label}
      </label>
      <div className="mgmt-pop-datetime" id={id}>
        <DatePicker
          className="mgmt-pop-date-picker"
          value={date}
          onChange={(nextDate) => {
            if (!nextDate) {
              onChange('');
              return;
            }
            onChange(joinDateTimeLocal(nextDate, time || '00:00'));
          }}
          min={minDate}
          direction="auto"
        />
        <TimePicker
          className="mgmt-pop-time-picker"
          value={time}
          onChange={(nextTime) => {
            if (!nextTime && !date) {
              onChange('');
              return;
            }
            onChange(joinDateTimeLocal(date || getTodayDateString(), nextTime || '00:00'));
          }}
          style={{ width: 96 }}
        />
      </div>
    </div>
  );
}

function withSelectedOption(options: string[], selected: string): string[] {
  const trimmed = selected.trim();
  if (!trimmed) return options;
  if (options.some((o) => o.toLowerCase() === trimmed.toLowerCase())) return options;
  return [trimmed, ...options];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  open,
  filters,
  transporterOptions = [],
  customerOptions = [],
  onClose,
  onApply,
  t,
}) => {
  const [draft, setDraft] = useState<ShipmentsFilterState>(filters);
  const [productOptions, setProductOptions] = useState<{ id: string; name: string }[]>([]);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(filters);
      setRangeError(null);
    }
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Only types that exist in this shipper's Product Master (entered SKUs).
    productMasterService
      .getEnteredReferenceCategories()
      .then((cats) => {
        if (cancelled) return;
        setProductOptions(mapReferenceToProductTypes(cats).map((pt) => ({ id: String(pt.id), name: pt.name })));
      })
      .catch(() => {
        if (!cancelled) setProductOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const productTypeNames = useMemo(() => {
    const map: Record<string, string> = {};
    productOptions.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [productOptions]);

  const transporterChoices = useMemo(
    () => withSelectedOption(transporterOptions, draft.carrier_name),
    [transporterOptions, draft.carrier_name]
  );

  const customerChoices = useMemo(
    () => withSelectedOption(customerOptions, draft.customer),
    [customerOptions, draft.customer]
  );

  const transporterSelectOptions = useMemo(() => {
    if (transporterChoices.length === 0) return [];
    return [
      { value: '', label: t('filterCarrierAll') },
      ...transporterChoices.map((name) => ({ value: name, label: name })),
    ];
  }, [transporterChoices, t]);

  const customerSelectOptions = useMemo(() => {
    if (customerChoices.length === 0) return [];
    return [
      { value: '', label: t('filterCustomerAll') },
      ...customerChoices.map((name) => ({ value: name, label: name })),
    ];
  }, [customerChoices, t]);

  const update = <K extends keyof ShipmentsFilterState>(key: K, value: ShipmentsFilterState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setRangeError(null);
  };

  const toggleProductType = (id: string) => {
    setDraft((prev) => {
      const has = prev.product_type.includes(id);
      return {
        ...prev,
        product_type: has ? prev.product_type.filter((x) => x !== id) : [...prev.product_type, id],
      };
    });
  };

  if (!open) return null;

  return createPortal(
    <div className="mgmt-pop-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="mgmt-pop mgmt-pop--filter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mgmt-filter-title"
      >
        <div className="mgmt-pop-h">
          <div>
            <h3 id="mgmt-filter-title">{t('filter')}</h3>
            <p className="mgmt-pop-sub">{t('filterModalSubtitle') || 'Narrow the shipments list'}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>

        <div className="mgmt-pop-body">
          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionGeneral') || 'General'}</h4>
            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterCarrierName')}</span>
              <SearchableSelect
                options={transporterSelectOptions}
                value={draft.carrier_name}
                onChange={(v) => update('carrier_name', v)}
                placeholder={
                  transporterChoices.length === 0
                    ? t('filterNoTransporters')
                    : t('filterCarrierAll')
                }
                searchPlaceholder={t('filterCarrierNamePlaceholder')}
                disabled={transporterChoices.length === 0 && !draft.carrier_name}
                menuFixed
                direction="auto"
              />
            </div>

            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterProductType')}</span>
              <div className="mgmt-pop-chips">
                {productOptions.length === 0 ? (
                  <span className="mgmt-pop-hint">{t('filterNoProductTypes')}</span>
                ) : (
                  productOptions.map((pt) => {
                    const active = draft.product_type.includes(pt.id);
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        className={`mgmt-seg-btn${active ? ' act' : ''}`}
                        onClick={() => toggleProductType(pt.id)}
                      >
                        {pt.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterChannel')}</span>
              <div className="mgmt-seg" role="group" aria-label={t('filterChannel')}>
                {(
                  [
                    ['all', 'filterChannelAll'],
                    ['private', 'filterChannelPrivate'],
                    ['public', 'filterChannelPublic'],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    className={`mgmt-seg-btn${draft.channel === value ? ' act' : ''}`}
                    onClick={() => update('channel', value)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterTripMode')}</span>
              <div className="mgmt-seg" role="group" aria-label={t('filterTripMode')}>
                {(
                  [
                    ['', 'filterAny'],
                    ['direct', 'filterTripDirect'],
                    ['multiple', 'filterTripMultiple'],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={labelKey}
                    type="button"
                    className={`mgmt-seg-btn${draft.trip_mode === value ? ' act' : ''}`}
                    onClick={() => update('trip_mode', value)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionLocations') || 'Locations'}</h4>
            <FilterLocationField
              id="filter-pickup-address"
              label={t('filterPickupLocation')}
              address={draft.pickup_address}
              lat={draft.pickup_lat}
              lng={draft.pickup_lng}
              radius={draft.pickup_radius}
              onAddressChange={(v) => update('pickup_address', v)}
              onLatLngChange={(la, ln) => {
                setDraft((prev) => ({ ...prev, pickup_lat: la, pickup_lng: ln }));
              }}
              onRadiusChange={(r) => update('pickup_radius', r)}
              t={t}
            />
            <FilterLocationField
              id="filter-dropoff-address"
              label={t('filterDropoffLocation')}
              address={draft.dropoff_address}
              lat={draft.dropoff_lat}
              lng={draft.dropoff_lng}
              radius={draft.dropoff_radius}
              onAddressChange={(v) => update('dropoff_address', v)}
              onLatLngChange={(la, ln) => {
                setDraft((prev) => ({ ...prev, dropoff_lat: la, dropoff_lng: ln }));
              }}
              onRadiusChange={(r) => update('dropoff_radius', r)}
              t={t}
            />
          </section>

          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionRanges') || 'Trip & price'}</h4>
            <div className="mgmt-pop-grid">
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="trip-min">
                  {t('filterTripKmMin')}
                </label>
                <input
                  id="trip-min"
                  type="number"
                  min={0}
                  className="mgmt-pop-input"
                  value={draft.trip_km_min}
                  onChange={(e) => update('trip_km_min', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="trip-max">
                  {t('filterTripKmMax')}
                </label>
                <input
                  id="trip-max"
                  type="number"
                  min={0}
                  className="mgmt-pop-input"
                  value={draft.trip_km_max}
                  onChange={(e) => update('trip_km_max', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="price-min">
                  {t('filterPriceMin')}
                </label>
                <input
                  id="price-min"
                  type="number"
                  min={0}
                  className="mgmt-pop-input"
                  value={draft.price_min}
                  onChange={(e) => update('price_min', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="price-max">
                  {t('filterPriceMax')}
                </label>
                <input
                  id="price-max"
                  type="number"
                  min={0}
                  className="mgmt-pop-input"
                  value={draft.price_max}
                  onChange={(e) => update('price_max', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionDates') || 'Dates'}</h4>
            <div className="mgmt-pop-grid">
              <FilterDateTimeField
                id="pickup-from"
                label={t('filterPickupFrom')}
                value={draft.pickup_from}
                onChange={(v) => update('pickup_from', v)}
              />
              <FilterDateTimeField
                id="pickup-to"
                label={t('filterPickupTo')}
                value={draft.pickup_to}
                onChange={(v) => update('pickup_to', v)}
                minDate={splitDateTimeLocal(draft.pickup_from).date || undefined}
              />
              <FilterDateTimeField
                id="dropoff-from"
                label={t('filterDropoffFrom')}
                value={draft.dropoff_from}
                onChange={(v) => update('dropoff_from', v)}
              />
              <FilterDateTimeField
                id="dropoff-to"
                label={t('filterDropoffTo')}
                value={draft.dropoff_to}
                onChange={(v) => update('dropoff_to', v)}
                minDate={splitDateTimeLocal(draft.dropoff_from).date || undefined}
              />
              <FilterDateTimeField
                id="posted-from"
                label={t('filterPostedFrom')}
                value={draft.posted_from}
                onChange={(v) => update('posted_from', v)}
              />
              <FilterDateTimeField
                id="posted-to"
                label={t('filterPostedTo')}
                value={draft.posted_to}
                onChange={(v) => update('posted_to', v)}
                minDate={splitDateTimeLocal(draft.posted_from).date || undefined}
              />
            </div>
          </section>

          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionMore') || 'More'}</h4>
            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterBidInterestState')}</span>
              <div className="mgmt-seg" role="group" aria-label={t('filterBidInterestState')}>
                {(
                  [
                    ['', 'filterAny'],
                    ['has_interest', 'filterHasInterest'],
                    ['no_interest', 'filterNoInterest'],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={labelKey}
                    type="button"
                    className={`mgmt-seg-btn${draft.bid_state === value ? ' act' : ''}`}
                    onClick={() => update('bid_state', value)}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterCustomer')}</span>
              <SearchableSelect
                options={customerSelectOptions}
                value={draft.customer}
                onChange={(v) => update('customer', v)}
                placeholder={
                  customerChoices.length === 0 ? t('filterNoCustomers') : t('filterCustomerAll')
                }
                searchPlaceholder={t('filterCustomerPlaceholder')}
                disabled={customerChoices.length === 0 && !draft.customer}
                menuFixed
                direction="auto"
              />
            </div>
          </section>

          {rangeError && <p className="mgmt-pop-error">{t(rangeError)}</p>}
        </div>

        <div className="mgmt-pop-ft">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDraft(DEFAULT_FILTERS);
              setRangeError(null);
              onApply(DEFAULT_FILTERS, productTypeNames);
              onClose();
            }}
          >
            {t('filterReset')}
          </button>
          <div className="mgmt-pop-ft-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const err = validateFilterRanges(draft);
                if (err) {
                  setRangeError(err);
                  return;
                }
                if (onApply(draft, productTypeNames)) onClose();
              }}
            >
              {t('filterApply')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
