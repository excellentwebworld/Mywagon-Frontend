import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { productMasterService } from '../../api/services/productMasterService';
import { mapReferenceToProductTypes } from '../../api/mappers/productMasterMapper';
import {
  DEFAULT_FILTERS,
  validateFilterRanges,
  type ShipmentsFilterState,
} from '../../pages/ManageShipments/utils/listingUtils';
import { FilterLocationField } from './FilterLocationField';

interface FilterModalProps {
  open: boolean;
  filters: ShipmentsFilterState;
  onClose: () => void;
  onApply: (filters: ShipmentsFilterState, productTypeNames: Record<string, string>) => boolean;
  t: (key: string) => string;
}

export const FilterModal: React.FC<FilterModalProps> = ({ open, filters, onClose, onApply, t }) => {
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
    productMasterService
      .getReferenceCategories()
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
              <label className="mgmt-pop-label" htmlFor="filter-carrier">
                {t('filterCarrierName')}
              </label>
              <input
                id="filter-carrier"
                className="mgmt-pop-input"
                value={draft.carrier_name}
                onChange={(e) => update('carrier_name', e.target.value)}
                placeholder={t('filterCarrierNamePlaceholder')}
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
              <div className="mgmt-seg">
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
              <div className="mgmt-seg">
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
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="pickup-from">
                  {t('filterPickupFrom')}
                </label>
                <input
                  id="pickup-from"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.pickup_from}
                  onChange={(e) => update('pickup_from', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="pickup-to">
                  {t('filterPickupTo')}
                </label>
                <input
                  id="pickup-to"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.pickup_to}
                  onChange={(e) => update('pickup_to', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="dropoff-from">
                  {t('filterDropoffFrom')}
                </label>
                <input
                  id="dropoff-from"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.dropoff_from}
                  onChange={(e) => update('dropoff_from', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="dropoff-to">
                  {t('filterDropoffTo')}
                </label>
                <input
                  id="dropoff-to"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.dropoff_to}
                  onChange={(e) => update('dropoff_to', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="posted-from">
                  {t('filterPostedFrom')}
                </label>
                <input
                  id="posted-from"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.posted_from}
                  onChange={(e) => update('posted_from', e.target.value)}
                />
              </div>
              <div className="mgmt-pop-field">
                <label className="mgmt-pop-label" htmlFor="posted-to">
                  {t('filterPostedTo')}
                </label>
                <input
                  id="posted-to"
                  type="datetime-local"
                  className="mgmt-pop-input"
                  value={draft.posted_to}
                  onChange={(e) => update('posted_to', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="mgmt-pop-sec">
            <h4 className="mgmt-pop-sec-title">{t('filterSectionMore') || 'More'}</h4>
            <div className="mgmt-pop-field">
              <span className="mgmt-pop-label">{t('filterBidInterestState')}</span>
              <div className="mgmt-seg mgmt-seg--wrap">
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
              <label className="mgmt-pop-label" htmlFor="filter-customer">
                {t('filterCustomer')}
              </label>
              <input
                id="filter-customer"
                className="mgmt-pop-input"
                value={draft.customer}
                onChange={(e) => update('customer', e.target.value)}
                placeholder={t('filterCustomerPlaceholder')}
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
