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
    <div className="modal-backdrop open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-form" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('sort')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SORT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                background: draft === opt.value ? 'var(--accent-light)' : 'var(--surface)',
              }}
            >
              <input
                type="radio"
                name="shipment-sort"
                checked={draft === opt.value}
                onChange={() => setDraft(opt.value)}
              />
              <span style={{ fontSize: 13 }}>{t(opt.labelKey)}</span>
            </label>
          ))}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            className="f-pill"
            onClick={() => {
              setDraft('');
              onApply('');
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
              onApply(draft);
              onClose();
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
