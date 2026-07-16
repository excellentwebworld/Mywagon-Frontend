import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QuickFilterKey, TripFilter } from '../../pages/SearchTrucks/types';

export interface SatFilterDraft {
  pickupRadius: number;
  dropoffRadius: number;
  tripType: TripFilter;
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

const QUICK_ROWS: { key: QuickFilterKey; labelKey: string; premium?: boolean }[] = [
  { key: 'today', labelKey: 'satChipToday' },
  { key: 'soon8h', labelKey: 'satChipSoon8h' },
  { key: 'has_bids', labelKey: 'satChipHasBids', premium: true },
  { key: 'load_match', labelKey: 'satChipLoadMatch', premium: true },
];

const TRIP_OPTIONS: { key: TripFilter; labelKey: string }[] = [
  { key: 'any', labelKey: 'satTripAny' },
  { key: 'multi_stop', labelKey: 'satTripMulti' },
  { key: 'direct', labelKey: 'satTripDirect' },
];

export const SatFilterModal: React.FC<SatFilterModalProps> = ({
  open,
  draft: initial,
  onClose,
  onApply,
  onReset,
  t,
}) => {
  const [draft, setDraft] = useState<SatFilterDraft>(initial);

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

  if (!open) return null;

  const toggleQuick = (key: QuickFilterKey) => {
    setDraft((prev) => {
      const has = prev.quickFilters.includes(key);
      return {
        ...prev,
        quickFilters: has
          ? prev.quickFilters.filter((k) => k !== key)
          : [...prev.quickFilters, key],
      };
    });
  };

  return createPortal(
    <div
      className="sat-pop-bg open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="sat-pop sat-pop--filter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sat-filter-title"
      >
        <div className="sat-pop-h">
          <div>
            <h3 id="sat-filter-title">{t('satFilter') || 'Filter'}</h3>
            <p className="sat-pop-sub">
              {t('satFilterModalSubtitle') || 'Narrow available trucks'}
            </p>
          </div>
          <button type="button" className="sat-pop-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="sat-pop-body">
          <section className="sat-pop-sec">
            <h4 className="sat-pop-sec-title">{t('satFilterSectionTrip') || 'Trip preference'}</h4>
            <div className="sat-pop-seg">
              {TRIP_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`sat-pop-seg-btn${draft.tripType === opt.key ? ' act' : ''}`}
                  onClick={() => setDraft((p) => ({ ...p, tripType: opt.key }))}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </section>

          <section className="sat-pop-sec">
            <h4 className="sat-pop-sec-title">{t('satFilterSectionRadius') || 'Search radius'}</h4>
            <div className="sat-pop-field">
              <label className="sat-pop-label" htmlFor="sat-pickup-radius">
                {t('satPickupRadius') || 'Pickup radius'} — {draft.pickupRadius} km
              </label>
              <input
                id="sat-pickup-radius"
                className="sat-pop-range"
                type="range"
                min={50}
                max={300}
                step={10}
                value={draft.pickupRadius}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, pickupRadius: Number(e.target.value) }))
                }
              />
            </div>
            <div className="sat-pop-field">
              <label className="sat-pop-label" htmlFor="sat-dropoff-radius">
                {t('satDropoffRadius') || 'Dropoff radius'} — {draft.dropoffRadius} km
              </label>
              <input
                id="sat-dropoff-radius"
                className="sat-pop-range"
                type="range"
                min={50}
                max={300}
                step={10}
                value={draft.dropoffRadius}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, dropoffRadius: Number(e.target.value) }))
                }
              />
            </div>
          </section>

          <section className="sat-pop-sec">
            <h4 className="sat-pop-sec-title">{t('satFilterSectionQuick') || 'Quick filters'}</h4>
            <div className="sat-pop-checks">
              {QUICK_ROWS.map((row) => {
                const checked = draft.quickFilters.includes(row.key);
                return (
                  <label key={row.key} className={`sat-pop-check${checked ? ' act' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleQuick(row.key)}
                    />
                    <span>
                      {row.premium ? (
                        <span className="sat-chip-prem">{t('satPremium')}</span>
                      ) : null}{' '}
                      {t(row.labelKey)}
                    </span>
                  </label>
                );
              })}
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
