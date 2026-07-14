import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FilterPlaceholderModalProps {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

export const FilterPlaceholderModal: React.FC<FilterPlaceholderModalProps> = ({ open, onClose, t }) => {
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
      <div className="modal modal-form" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('filter')}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('cancel')}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {t('filterComingSoon')}
          </p>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cta" style={{ padding: '8px 16px', fontSize: 13 }} onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
