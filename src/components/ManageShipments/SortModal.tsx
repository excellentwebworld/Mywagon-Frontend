import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SORT_OPTIONS, type SortKey } from '../../pages/ManageShipments/utils/listingUtils';

interface SortModalProps {
  open: boolean;
  sortKey: SortKey;
  onClose: () => void;
  onApply: (key: SortKey) => void;
  t: (key: string) => string;
}

export const SortModal: React.FC<SortModalProps> = ({ open, sortKey, onClose, onApply, t }) => {
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
    <div className="mgmt-pop-bg open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="mgmt-pop mgmt-pop--sort"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mgmt-sort-title"
      >
        <div className="mgmt-pop-h">
          <div>
            <h3 id="mgmt-sort-title">{t('sort')}</h3>
            <p className="mgmt-pop-sub">{t('sortModalSubtitle') || 'Choose how shipments are ordered'}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>

        <div className="mgmt-pop-body mgmt-pop-body--compact">
          <div className="mgmt-sort-list" role="radiogroup" aria-label={t('sort')}>
            {SORT_OPTIONS.map((opt) => {
              const active = draft === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`mgmt-sort-item${active ? ' act' : ''}`}
                  onClick={() => setDraft(opt.value)}
                >
                  <span className="mgmt-sort-label">{t(opt.labelKey)}</span>
                  <span className={`mgmt-sort-radio${active ? ' act' : ''}`} aria-hidden />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mgmt-pop-ft">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDraft('');
              onApply('');
              onClose();
            }}
          >
            {t('sortReset')}
          </button>
          <div className="mgmt-pop-ft-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              {t('sortApply')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
