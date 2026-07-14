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

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
};

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
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-form"
        style={{ maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('filter')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="filter-carrier">
              {t('filterCarrierName')}
            </label>
            <input
              id="filter-carrier"
              style={inputStyle}
              value={draft.carrier_name}
              onChange={(e) => update('carrier_name', e.target.value)}
              placeholder={t('filterCarrierNamePlaceholder')}
            />
          </div>

          <div style={fieldStyle}>
            <span style={labelStyle}>{t('filterProductType')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {productOptions.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('filterNoProductTypes')}</span>
              ) : (
                productOptions.map((pt) => (
                  <label
                    key={pt.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: draft.product_type.includes(pt.id) ? 'var(--accent-light)' : 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={draft.product_type.includes(pt.id)}
                      onChange={() => toggleProductType(pt.id)}
                    />
                    {pt.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={fieldStyle}>
            <span style={labelStyle}>{t('filterChannel')}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['all', 'filterChannelAll'],
                  ['private', 'filterChannelPrivate'],
                  ['public', 'filterChannelPublic'],
                ] as const
              ).map(([value, labelKey]) => (
                <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="filter-channel"
                    checked={draft.channel === value}
                    onChange={() => update('channel', value)}
                  />
                  {t(labelKey)}
                </label>
              ))}
            </div>
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="trip-min">
                {t('filterTripKmMin')}
              </label>
              <input
                id="trip-min"
                type="number"
                min={0}
                style={inputStyle}
                value={draft.trip_km_min}
                onChange={(e) => update('trip_km_min', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="trip-max">
                {t('filterTripKmMax')}
              </label>
              <input
                id="trip-max"
                type="number"
                min={0}
                style={inputStyle}
                value={draft.trip_km_max}
                onChange={(e) => update('trip_km_max', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="price-min">
                {t('filterPriceMin')}
              </label>
              <input
                id="price-min"
                type="number"
                min={0}
                style={inputStyle}
                value={draft.price_min}
                onChange={(e) => update('price_min', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="price-max">
                {t('filterPriceMax')}
              </label>
              <input
                id="price-max"
                type="number"
                min={0}
                style={inputStyle}
                value={draft.price_max}
                onChange={(e) => update('price_max', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="pickup-from">
                {t('filterPickupFrom')}
              </label>
              <input
                id="pickup-from"
                type="datetime-local"
                style={inputStyle}
                value={draft.pickup_from}
                onChange={(e) => update('pickup_from', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="pickup-to">
                {t('filterPickupTo')}
              </label>
              <input
                id="pickup-to"
                type="datetime-local"
                style={inputStyle}
                value={draft.pickup_to}
                onChange={(e) => update('pickup_to', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="dropoff-from">
                {t('filterDropoffFrom')}
              </label>
              <input
                id="dropoff-from"
                type="datetime-local"
                style={inputStyle}
                value={draft.dropoff_from}
                onChange={(e) => update('dropoff_from', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="dropoff-to">
                {t('filterDropoffTo')}
              </label>
              <input
                id="dropoff-to"
                type="datetime-local"
                style={inputStyle}
                value={draft.dropoff_to}
                onChange={(e) => update('dropoff_to', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="posted-from">
                {t('filterPostedFrom')}
              </label>
              <input
                id="posted-from"
                type="datetime-local"
                style={inputStyle}
                value={draft.posted_from}
                onChange={(e) => update('posted_from', e.target.value)}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="posted-to">
                {t('filterPostedTo')}
              </label>
              <input
                id="posted-to"
                type="datetime-local"
                style={inputStyle}
                value={draft.posted_to}
                onChange={(e) => update('posted_to', e.target.value)}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <span style={labelStyle}>{t('filterBidInterestState')}</span>
            <select
              style={inputStyle}
              value={draft.bid_state}
              onChange={(e) => update('bid_state', e.target.value as ShipmentsFilterState['bid_state'])}
            >
              <option value="">{t('filterAny')}</option>
              <option value="has_interest">{t('filterHasInterest')}</option>
              <option value="no_interest">{t('filterNoInterest')}</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="filter-customer">
              {t('filterCustomer')}
            </label>
            <input
              id="filter-customer"
              style={inputStyle}
              value={draft.customer}
              onChange={(e) => update('customer', e.target.value)}
              placeholder={t('filterCustomerPlaceholder')}
            />
          </div>

          <div style={fieldStyle}>
            <span style={labelStyle}>{t('filterTripMode')}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['', 'filterAny'],
                  ['direct', 'filterTripDirect'],
                  ['multiple', 'filterTripMultiple'],
                ] as const
              ).map(([value, labelKey]) => (
                <label key={labelKey} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="filter-trip-mode"
                    checked={draft.trip_mode === value}
                    onChange={() => update('trip_mode', value)}
                  />
                  {t(labelKey)}
                </label>
              ))}
            </div>
          </div>

          {rangeError && (
            <p style={{ margin: 0, color: 'var(--danger)', fontSize: 12 }}>{t(rangeError)}</p>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="f-pill"
            onClick={() => {
              setDraft(DEFAULT_FILTERS);
              setRangeError(null);
              onApply(DEFAULT_FILTERS, productTypeNames);
              onClose();
            }}
          >
            {t('sortReset')}
          </button>
          <button
            type="button"
            className="btn-cta"
            style={{ padding: '8px 16px', fontSize: 13 }}
            onClick={() => {
              const err = validateFilterRanges(draft);
              if (err) {
                setRangeError(err);
                return;
              }
              if (onApply(draft, productTypeNames)) onClose();
            }}
          >
            {t('sortApply')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
