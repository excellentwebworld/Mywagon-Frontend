import React, { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import fullLogo from '../../assets/logo/fullLogo.svg';
import '../Login/LoginPage.css';

/** Persist referral / invite query for later signup phases. */
export const SIGNUP_QUERY_STORAGE_KEY = 'shipper_signup_query';

export const RegisterPage: React.FC = () => {
  const particlesRef = useLoginParticles();
  const { isAuthenticated, isLoading } = useAuth();
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs) return;
    try {
      sessionStorage.setItem(SIGNUP_QUERY_STORAGE_KEY, qs);
    } catch {
      /* ignore quota / private mode */
    }
  }, [searchParams]);

  if (isLoading) {
    return <MyVagonBootScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLanguageChange = (checked: boolean) => {
    const next = checked ? 'en' : 'el';
    setLang(next);
    void i18n.changeLanguage(next);
  };

  return (
    <div className="shipper-login-page">
      <div ref={particlesRef} className="shipper-login-particles" aria-hidden="true" />

      <div className="shipper-login-content">
        <div className="shipper-login-card-cont">
          <div className="shipper-login-card">
            <div className="shipper-login-box new-login-page">
              <div className="shipper-login-container">
                <label className="shipper-login-lang-switch">
                  <input
                    type="checkbox"
                    checked={lang !== 'el'}
                    onChange={(e) => handleLanguageChange(e.target.checked)}
                    aria-label="Language"
                  />
                  <span className="shipper-login-lang-slider" />
                </label>

                <div className="shipper-login-header">
                  <Link to="/login" className="shipper-login-logo-link mt-2">
                    <img src={fullLogo} alt={t('appName')} className="shipper-login-logo" height={35} />
                  </Link>
                  <p className="shipper-login-para">
                    {t('registerComingSoon', {
                      defaultValue: 'Shipper registration is moving here. Full signup will be available soon.',
                    })}
                  </p>
                </div>

                <ul className="shipper-login-tabs" role="tablist">
                  <li className="shipper-login-tab-item">
                    <span className="shipper-login-tab active" role="tab" aria-selected>
                      {t('shipper')}
                    </span>
                  </li>
                </ul>

                <div className="shipper-login-tab-pane">
                  <h1 className="shipper-login-para" style={{ fontWeight: 600, marginBottom: 16 }}>
                    {t('loginSignup', { defaultValue: 'Signup' })}
                  </h1>
                  <p className="shipper-login-para" style={{ marginBottom: 24 }}>
                    {t('registerPlaceholderBody', {
                      defaultValue:
                        'This page will host the sign-up, company info, and KYC flow. Please use Login if you already have an account.',
                    })}
                  </p>
                  <div className="shipper-login-submit-wrap">
                    <Link to="/login" className="shipper-login-submit-btn" style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
                      {t('loginLogIn')}
                    </Link>
                  </div>
                  <div className="shipper-login-join-wrap">
                    <Link to="/login" className="shipper-login-join">
                      {t('registerBackToLogin', { defaultValue: 'Back to login' })}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
