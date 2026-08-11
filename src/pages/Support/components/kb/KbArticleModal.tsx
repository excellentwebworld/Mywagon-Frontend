import React, { useEffect } from 'react';
import type { KbArticleDetail } from '../../types';
import { KbHelpfulPrompt } from './KbHelpfulPrompt';

interface KbArticleModalProps {
  open: boolean;
  loading: boolean;
  article: KbArticleDetail | null;
  onClose: () => void;
  loadingLabel: string;
  onVote: (articleId: string, helpful: boolean) => Promise<void>;
  helpfulLabels: {
    label: string;
    yes: string;
    no: string;
    thanksYes: string;
    notedNo: string;
  };
}

export function KbArticleModal({
  open,
  loading,
  article,
  onClose,
  loadingLabel,
  onVote,
  helpfulLabels,
}: KbArticleModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="kb-modal-overlay show"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="kb-modal" role="dialog" aria-modal="true" aria-labelledby="kb-modal-title">
        <div className="kb-modal-head">
          <h3 id="kb-modal-title">{loading ? '…' : article?.title ?? ''}</h3>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="kb-modal-body">
          {loading ? (
            <div className="kb-loading">{loadingLabel}</div>
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
              <KbHelpfulPrompt
                articleId={article.id}
                label={helpfulLabels.label}
                yesLabel={helpfulLabels.yes}
                noLabel={helpfulLabels.no}
                thanksYes={helpfulLabels.thanksYes}
                notedNo={helpfulLabels.notedNo}
                onVote={(helpful) => onVote(article.id, helpful)}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
