import React, { useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import fullLogo from '../../assets/logo/fullLogo.svg';
import '../Login/LoginPage.css';
import './RegisterPage.css';
import { SIGNUP_QUERY_STORAGE_KEY } from './signupDraft';
import { useRegisterWizard } from './useRegisterWizard';
import { NameStep } from './steps/NameStep';
import { PhoneStep } from './steps/PhoneStep';
import { PhoneOtpStep } from './steps/PhoneOtpStep';
import { EmailStep } from './steps/EmailStep';
import { EmailOtpStep } from './steps/EmailOtpStep';
import { PasswordStep } from './steps/PasswordStep';
import { CompanyStep } from './steps/CompanyStep';
import { AddressStep } from './steps/AddressStep';
import { MarketingTermsStep } from './steps/MarketingTermsStep';
import { Phase2HoldStep } from './steps/Phase2HoldStep';

export { SIGNUP_QUERY_STORAGE_KEY };

export const RegisterPage: React.FC = () => {
  const particlesRef = useLoginParticles();
  const { isAuthenticated, isLoading } = useAuth();
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const wizard = useRegisterWizard(t);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs) return;
    try {
      sessionStorage.setItem(SIGNUP_QUERY_STORAGE_KEY, qs);
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  if (isLoading || wizard.referenceLoading) {
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

  const stepTitleDefaults: Record<string, string> = {
    registerStepName: "What's your name?",
    registerStepPhone: 'Verify your phone',
    registerStepPhoneOtp: 'Enter the code',
    registerStepEmail: 'Verify your email',
    registerStepEmailOtp: 'Enter the code',
    registerStepPassword: 'Secure your account',
    registerStepCompany: 'Your company',
    registerStepAddress: 'Company address',
    registerStepMarketing: 'Almost done',
    registerStepHold: 'Almost there',
  };

  const renderStep = () => {
    switch (wizard.stepKey) {
      case 'nm':
        return (
          <NameStep
            firstName={wizard.draft.first_name}
            lastName={wizard.draft.last_name}
            onFirstName={(v) => wizard.updateDraft({ first_name: v })}
            onLastName={(v) => wizard.updateDraft({ last_name: v })}
            errors={wizard.fieldErrors}
            disabled={wizard.busy}
          />
        );
      case 'ph':
        return (
          <PhoneStep
            countryCode={wizard.draft.country_code}
            phone={wizard.draft.phone}
            countryCodes={wizard.countryCodes}
            onCountryCode={wizard.setCountryCode}
            onPhone={wizard.setPhone}
            onSendCode={() => void wizard.sendPhoneCode()}
            errors={wizard.fieldErrors}
            busy={wizard.busy}
          />
        );
      case 'phOtp':
        return (
          <PhoneOtpStep
            countryCode={wizard.draft.country_code}
            phone={wizard.draft.phone}
            otp={wizard.phoneOtp}
            onOtp={wizard.setPhoneOtp}
            verified={wizard.draft.phoneVerified}
            onResend={() => void wizard.resendPhoneCode()}
            resendSeconds={wizard.resendSeconds}
            busy={wizard.busy}
            error={wizard.fieldErrors.otp}
          />
        );
      case 'em':
        return (
          <EmailStep
            email={wizard.draft.email}
            onEmail={wizard.setEmail}
            onSendCode={() => void wizard.sendEmailCode()}
            error={wizard.fieldErrors.email}
            busy={wizard.busy}
          />
        );
      case 'emOtp':
        return (
          <EmailOtpStep
            email={wizard.draft.email}
            otp={wizard.emailOtp}
            onOtp={wizard.setEmailOtp}
            verified={wizard.draft.emailVerified}
            onResend={() => void wizard.resendEmailCode()}
            resendSeconds={wizard.resendSeconds}
            busy={wizard.busy}
            error={wizard.fieldErrors.otp}
          />
        );
      case 'pw':
        return (
          <PasswordStep
            password={wizard.draft.password}
            confirm={wizard.draft.password_confirmation}
            onPassword={(v) => wizard.updateDraft({ password: v })}
            onConfirm={(v) => wizard.updateDraft({ password_confirmation: v })}
            errors={wizard.fieldErrors}
            disabled={wizard.busy}
          />
        );
      case 'co':
        return (
          <CompanyStep
            companyName={wizard.draft.company_name}
            onCompanyName={(v) => wizard.updateDraft({ company_name: v })}
            error={wizard.fieldErrors.company_name}
            disabled={wizard.busy}
          />
        );
      case 'ad':
        return (
          <AddressStep
            streetAddress={wizard.draft.street_address}
            addressLine2={wizard.draft.address_line_2}
            postalCode={wizard.draft.postal_code}
            city={wizard.draft.city}
            addressCountry={wizard.draft.address_country}
            lat={wizard.draft.lat}
            lng={wizard.draft.lng}
            countriesDomicile={wizard.countriesDomicile}
            onChange={(patch) => wizard.updateDraft(patch)}
            errors={wizard.fieldErrors}
            disabled={wizard.busy}
          />
        );
      case 'mk':
        return (
          <MarketingTermsStep
            hearAbout={wizard.draft.hear_about_us_shipper}
            hearAboutOther={wizard.draft.hear_about_us_other_shipper}
            referralCode={wizard.draft.referral_code}
            terms={wizard.draft.terms}
            lang={lang}
            onChange={(patch) => wizard.updateDraft(patch)}
            errors={wizard.fieldErrors}
            disabled={wizard.busy}
          />
        );
      case 'hold':
        return <Phase2HoldStep />;
      default:
        return null;
    }
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
                </div>

                {wizard.stepKey !== 'hold' && (
                  <p className="shipper-register-progress">
                    {t('registerStepOf', 'Step {{current}} of {{total}}', {
                      current: wizard.progressCurrent,
                      total: wizard.progressTotal,
                    })}
                  </p>
                )}

                <h1 className="shipper-register-step-title">
                  {t(wizard.stepTitleKey, stepTitleDefaults[wizard.stepTitleKey] || '')}
                </h1>

                {wizard.formError && (
                  <div className="shipper-login-alert" role="alert">
                    {wizard.formError}
                  </div>
                )}

                <div className="shipper-login-tab-pane">{renderStep()}</div>

                {wizard.showContinue && (
                  <div className="shipper-register-nav">
                    {wizard.canGoBack && (
                      <button
                        type="button"
                        className="shipper-register-back-btn"
                        disabled={wizard.busy}
                        onClick={wizard.goBack}
                      >
                        {t('registerBack', 'Back')}
                      </button>
                    )}
                    <div className="shipper-login-submit-wrap">
                      <button
                        type="button"
                        className="shipper-login-submit-btn"
                        disabled={!wizard.canContinue}
                        onClick={() => void wizard.onContinue()}
                      >
                        {wizard.busy
                          ? t('registerWorking', 'Please wait…')
                          : t('registerContinue', 'Continue')}
                      </button>
                    </div>
                  </div>
                )}

                {(wizard.stepKey === 'ph' || wizard.stepKey === 'em') && wizard.canGoBack && (
                  <div className="shipper-register-nav">
                    <button
                      type="button"
                      className="shipper-register-back-btn"
                      disabled={wizard.busy}
                      onClick={wizard.goBack}
                    >
                      {t('registerBack', 'Back')}
                    </button>
                  </div>
                )}

                {wizard.stepKey !== 'hold' && (
                  <div className="shipper-login-join-wrap">
                    <Link to="/login" className="shipper-login-join">
                      {t('registerBackToLogin', 'Back to login')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
