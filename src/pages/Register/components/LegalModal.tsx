import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { signupService, type SignupLegalDocument } from '../../../api/auth';

type LegalModalProps = {
  document: 'terms' | 'privacy' | null;
  legalData?: {
    terms_and_conditions?: SignupLegalDocument;
    privacy_policy?: SignupLegalDocument;
  } | null;
  onClose: () => void;
};

export const LegalModal: React.FC<LegalModalProps> = ({
  document,
  legalData,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  const docKey = document === 'terms' ? 'terms_and_conditions' : 'privacy_policy';

  useEffect(() => {
    if (!document) return;

    const fallbackTitle =
      document === 'terms'
        ? t('registerTermsLink', 'Terms & conditions')
        : t('registerPrivacyLink', 'Privacy policy');

    const preloaded = legalData?.[docKey];
    if (preloaded?.content) {
      setTitle(preloaded.title || fallbackTitle);
      setContent(preloaded.content);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setTitle(fallbackTitle);

    signupService
      .getLegalContent(docKey, i18n.language)
      .then((data) => {
        if (cancelled) return;
        if (data.title) setTitle(data.title);
        if (data.content) setContent(data.content);
      })
      .catch(() => {
        if (cancelled) return;
        setContent(
          `<p>${t('registerLegalUnavailable', 'Content is currently unavailable. Please try again later.')}</p>`
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [document, docKey, legalData, t, i18n.language]);

  useEffect(() => {
    if (!document) return;
    const prevOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.document.body.style.overflow = prevOverflow;
    };
  }, [document]);

  if (!document) return null;

  return (
    <div
      className="reg-success-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="reg-success-modal"
        style={{
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'left',
          padding: '2rem 2rem 1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '1rem',
            marginBottom: '1rem',
          }}
        >
          <h3
            id="legal-modal-title"
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1f1f41',
              margin: 0,
            }}
          >
            {title}
          </h3>
          <button
            type="button"
            className="reg-success-close"
            style={{ position: 'static' }}
            onClick={onClose}
            aria-label={t('registerClose', 'Close')}
          >
            &times;
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '0.5rem',
            color: '#374151',
            fontSize: '0.95rem',
            lineHeight: 1.6,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
              {t('common.loading', 'Loading…')}
            </div>
          ) : content ? (
            <div
              className="legal-content-body"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p>{t('registerLegalUnavailable', 'Content is currently unavailable.')}</p>
          )}
        </div>
      </div>
    </div>
  );
};
