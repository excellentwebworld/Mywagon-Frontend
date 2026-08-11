import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { KbArticleDetail } from '../../types';

interface KbArticleModalProps {
  open: boolean;
  loading: boolean;
  article: KbArticleDetail | null;
  error: string | null;
  onClose: () => void;
  loadingLabel: string;
  errorLabel: string;
}

export function KbArticleModal({
  open,
  loading,
  article,
  error,
  onClose,
  loadingLabel,
  errorLabel,
}: KbArticleModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="kb-modal-overlay show"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kb-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <h3 id="kb-modal-title">{loading ? loadingLabel : article?.title ?? errorLabel}</h3>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="kb-modal-body">
          {loading ? (
            <div className="kb-modal-loading" aria-busy="true">
              <div className="kb-modal-loading-line kb-modal-loading-line--title" />
              <div className="kb-modal-loading-line" />
              <div className="kb-modal-loading-line" />
              <div className="kb-modal-loading-line kb-modal-loading-line--short" />
            </div>
          ) : error ? (
            <div className="kb-modal-error" role="alert">
              {errorLabel}
            </div>
          ) : article ? (
            <>
              {article.tags.length > 0 ? (
                <div className="modal-tags">
                  {article.tags.map((tag) => (
                    <span key={tag} className="modal-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div
                className="kb-modal-content"
                dangerouslySetInnerHTML={{ __html: article.body_html }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
