import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { signupService, type SignupLegalDocument } from '../../api/auth';
import '../Register/RegisterPage.css';

type LegalPageProps = {
  document: 'terms' | 'privacy';
};

export const LegalPage: React.FC<LegalPageProps> = ({ document }) => {
  const { t, i18n } = useTranslation();
  const params = useParams<{ key?: string; type?: string; lang?: string }>();
  const docKey = document === 'terms' ? 'terms_and_conditions' : 'privacy_policy';
  const langKey = params.lang || (i18n.language === 'el' ? 'el' : 'en');

  const defaultTitle =
    document === 'terms'
      ? t('registerTermsLink', 'Terms & conditions')
      : t('registerPrivacyLink', 'Privacy policy');

  const [doc, setDoc] = useState<SignupLegalDocument | null>(() => {
    try {
      const cached =
        sessionStorage.getItem(`legal_${docKey}_${langKey}`) ||
        sessionStorage.getItem(`legal_${docKey}`);
      if (cached) {
        return {
          title: defaultTitle,
          content: cached,
        };
      }
    } catch {
      /* ignore */
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!doc);

  useEffect(() => {
    let cancelled = false;

    // Check session storage first for specific language
    try {
      const cached =
        sessionStorage.getItem(`legal_${docKey}_${langKey}`) ||
        sessionStorage.getItem(`legal_${docKey}`);
      if (cached) {
        setDoc({ title: defaultTitle, content: cached });
        setLoading(false);
      }
    } catch {
      /* ignore */
    }

    signupService
      .getLegalContent(docKey, langKey)
      .then((data) => {
        if (cancelled) return;
        if (data?.content) {
          setDoc(data);
          try {
            sessionStorage.setItem(`legal_${docKey}_${langKey}`, data.content);
            sessionStorage.setItem(`legal_${docKey}`, data.content);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (!doc) {
          setDoc({
            title: defaultTitle,
            content: `<p>${t('registerLegalUnavailable', 'Content is currently unavailable. Please try again later.')}</p>`,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docKey, defaultTitle, langKey, t]);

  return (
    <div
      className="reg-page"
      style={{
        background: '#f8fafc',
        minHeight: '100vh',
        padding: '2rem 1rem',
        fontFamily: 'Nunito, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <Link
            to="/shipper/register"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <img src="/logo.png" alt="MYVAGON" style={{ height: '40px' }} />
          </Link>
          <Link
            to="/shipper/register"
            style={{
              color: '#4e5cdb',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              padding: '0.5rem 1rem',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            &larr; {t('registerBackToRegister', 'Back to Sign Up')}
          </Link>
        </div>

        <div
          className="content-page"
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '3rem 2.5rem',
            boxShadow: '0 4px 25px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b7280' }}>
              {t('common.loading', 'Loading…')}
            </div>
          ) : (
            <div
              className="legal-content-body"
              style={{
                color: '#2d3748',
                fontSize: '1.05rem',
                lineHeight: 1.75,
                textAlign: 'justify',
              }}
              dangerouslySetInnerHTML={{ __html: doc?.content || '' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
