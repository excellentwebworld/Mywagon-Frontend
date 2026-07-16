import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SortKey } from '../../pages/SearchTrucks/types';

export const SAT_SORT_OPTIONS: { key: SortKey; labelKey: string }[] = [
  { key: 'truck_asc', labelKey: 'satSortTruckAsc' },
  { key: 'truck_desc', labelKey: 'satSortTruckDesc' },
  { key: 'availability_asc', labelKey: 'satSortAvailableEarliest' },
  { key: 'availability_desc', labelKey: 'satSortAvailableLatest' },
  { key: 'earliest_posting_date', labelKey: 'satSortEarliestPosting' },
  { key: 'latest_posting_date', labelKey: 'satSortLatestPosting' },
  { key: 'pickup_asc', labelKey: 'satSortPickupAsc' },
  { key: 'pickup_desc', labelKey: 'satSortPickupDesc' },
  { key: 'dropoff_asc', labelKey: 'satSortDropoffAsc' },
  { key: 'dropoff_desc', labelKey: 'satSortDropoffDesc' },
  { key: 'carrier_asc', labelKey: 'satSortCarrierAsc' },
  { key: 'carrier_desc', labelKey: 'satSortCarrierDesc' },
  { key: 'price_asc', labelKey: 'satSortPriceAsc' },
  { key: 'price_desc', labelKey: 'satSortPriceDesc' },
];

export function satSortLabelKey(sortKey: SortKey): string {
  if (!sortKey) return 'satSortAvailableEarliest';
  return SAT_SORT_OPTIONS.find((o) => o.key === sortKey)?.labelKey ?? 'satSortAvailableEarliest';
}

interface SatSortModalProps {
  open: boolean;
  sortKey: SortKey;
  onClose: () => void;
  onApply: (key: SortKey) => void;
  t: (key: string) => string;
}

export const SatSortModal: React.FC<SatSortModalProps> = ({
  open,
  sortKey,
  onClose,
  onApply,
  t,
}) => {
  const [draft, setDraft] = useState<SortKey>(sortKey);

  useEffect(() => {
    if (open) setDraft(sortKey);
  }, [open, sortKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="sat-pop-bg open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="sat-pop sat-pop--sort"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sat-sort-title"
      >
        <div className="sat-pop-h">
          <div>
            <h3 id="sat-sort-title">{t('satSort') || 'Sort'}</h3>
          </div>
          <button type="button" className="sat-pop-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>

        <div className="sat-pop-body sat-pop-body--compact">
          <div className="sat-sort-list" role="radiogroup" aria-label={t('satSort')}>
            {SAT_SORT_OPTIONS.map((opt) => {
              const active = draft === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`sat-sort-item${active ? ' act' : ''}`}
                  onClick={() => setDraft(opt.key)}
                >
                  <span className="sat-sort-label">{t(opt.labelKey)}</span>
                  <span className={`sat-sort-radio${active ? ' act' : ''}`} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <div className="sat-pop-ft">
          <button
            type="button"
            className="sat-btn"
            onClick={() => {
              setDraft('');
              onApply('');
              onClose();
            }}
          >
            {t('satSortReset') || 'Reset'}
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
              {t('satSortApply') || 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
