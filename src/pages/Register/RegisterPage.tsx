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
import { useRegisterForm } from './useRegisterForm';
import { CountryCodeSelect } from './components/CountryCodeSelect';
import { VerifyOtpModal } from './components/VerifyOtpModal';
import { NameStep } from './steps/NameStep';
import { PasswordStep } from './steps/PasswordStep';
import { CompanyStep } from './steps/CompanyStep';
import { AddressStep } from './steps/AddressStep';
import { MarketingTermsStep, RegisterTermsCheckbox } from './steps/MarketingTermsStep';
import { KycStep } from './steps/KycStep';
import { SignupSuccessStep } from './steps/SignupSuccessStep';

export { SIGNUP_QUERY_STORAGE_KEY };

export const RegisterPage: React.FC = () => {
  const particlesRef = useLoginParticles();
  const { isAuthenticated, isLoading } = useAuth();
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const form = useRegisterForm(t);

  useEffect(() => {
    const qs = searchParams.toString();
    if (!qs) return;
    try {
      sessionStorage.setItem(SIGNUP_QUERY_STORAGE_KEY, qs);
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  if (isLoading || form.referenceLoading) {
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
          <div className={`shipper-login-card shipper-register-card${form.submitted ? '' : ' shipper-register-card--tall'}`}>
            <div className="shipper-login-box new-login-page">
              <div className="shipper-login-container shipper-register-container">
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

                {form.submitted ? (
                  <SignupSuccessStep />
                ) : (
                  <>
                    <h1 className="shipper-register-page-title">
                      {t('registerPageTitle', 'Create your shipper account')}
                    </h1>

                    {form.formError && (
                      <div className="shipper-login-alert" role="alert">
                        {form.formError}
                      </div>
                    )}

                    <div className="shipper-register-form">
                      <section className="shipper-register-section" aria-labelledby="register-account-heading">
                        <h2 id="register-account-heading" className="shipper-register-section-title">
                          {t('registerSectionAccount', 'Account & User Info')}
                        </h2>

                        <NameStep
                          firstName={form.draft.first_name}
                          lastName={form.draft.last_name}
                          onFirstName={(v) => form.updateDraft({ first_name: v })}
                          onLastName={(v) => form.updateDraft({ last_name: v })}
                          errors={form.fieldErrors}
                          disabled={form.busy}
                        />

                        <CompanyStep
                          companyName={form.draft.company_name}
                          onCompanyName={(v) => form.updateDraft({ company_name: v })}
                          error={form.fieldErrors.company_name}
                          disabled={form.busy}
                        />

                        <div className="shipper-login-field">
                          <label htmlFor="register-phone">{t('registerPhone', 'Mobile phone')}</label>
                          <div className="shipper-register-verify-row">
                            <div className="shipper-register-phone-row">
                              <CountryCodeSelect
                                value={form.draft.country_code}
                                options={form.countryCodes}
                                onChange={form.setCountryCode}
                                disabled={form.busy}
                                error={form.fieldErrors.country_code}
                              />
                              <input
                                id="register-phone"
                                className="shipper-login-control shipper-register-phone-input"
                                type="tel"
                                inputMode="numeric"
                                value={form.draft.phone}
                                disabled={form.busy}
                                autoComplete="tel-national"
                                onChange={(e) => form.setPhone(e.target.value)}
                                placeholder={t('registerPhonePlaceholder', '6941234567')}
                                maxLength={10}
                              />
                            </div>
                            {form.draft.phoneVerified ? (
                              <button type="button" className="shipper-register-verify-btn is-verified" disabled>
                                {t('registerVerifiedBadge', 'Verified')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="shipper-register-verify-btn"
                                disabled={form.busy}
                                onClick={() => void form.openPhoneOtp()}
                              >
                                {form.busy ? t('registerWorking', 'Please wait…') : t('registerVerify', 'Verify')}
                              </button>
                            )}
                          </div>
                          {form.fieldErrors.phone && (
                            <p className="shipper-login-field-error" role="alert">
                              {form.fieldErrors.phone}
                            </p>
                          )}
                        </div>

                        <div className="shipper-login-field">
                          <label htmlFor="register-email">{t('registerEmail', 'Work email')}</label>
                          <div className="shipper-register-verify-row">
                            <input
                              id="register-email"
                              className="shipper-login-control shipper-register-verify-input"
                              type="email"
                              value={form.draft.email}
                              disabled={form.busy}
                              autoComplete="email"
                              onChange={(e) => form.setEmail(e.target.value)}
                              placeholder={t('registerEmailPlaceholder', 'name@company.com')}
                            />
                            {form.draft.emailVerified ? (
                              <button type="button" className="shipper-register-verify-btn is-verified" disabled>
                                {t('registerVerifiedBadge', 'Verified')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="shipper-register-verify-btn"
                                disabled={form.busy}
                                onClick={() => void form.openEmailOtp()}
                              >
                                {form.busy ? t('registerWorking', 'Please wait…') : t('registerVerify', 'Verify')}
                              </button>
                            )}
                          </div>
                          {form.fieldErrors.email && (
                            <p className="shipper-login-field-error" role="alert">
                              {form.fieldErrors.email}
                            </p>
                          )}
                        </div>

                        <PasswordStep
                          password={form.draft.password}
                          confirm={form.draft.password_confirmation}
                          onPassword={(v) => form.updateDraft({ password: v })}
                          onConfirm={(v) => form.updateDraft({ password_confirmation: v })}
                          errors={form.fieldErrors}
                          disabled={form.busy}
                        />
                      </section>

                      <section className="shipper-register-section" aria-labelledby="register-address-heading">
                        <h2 id="register-address-heading" className="shipper-register-section-title">
                          {t('registerSectionAddress', 'Address')}
                        </h2>
                        <AddressStep
                          streetAddress={form.draft.street_address}
                          addressLine2={form.draft.address_line_2}
                          postalCode={form.draft.postal_code}
                          city={form.draft.city}
                          addressCountry={form.draft.address_country}
                          lat={form.draft.lat}
                          lng={form.draft.lng}
                          countriesDomicile={form.countriesDomicile}
                          onChange={(patch) => form.updateDraft(patch)}
                          errors={form.fieldErrors}
                          disabled={form.busy}
                        />
                      </section>

                      <section className="shipper-register-section" aria-labelledby="register-hear-heading">
                        <h2 id="register-hear-heading" className="shipper-register-section-title sr-only">
                          {t('registerHearAbout', 'How did you hear about us?')}
                        </h2>
                        <MarketingTermsStep
                          hearAbout={form.draft.hear_about_us_shipper}
                          hearAboutOther={form.draft.hear_about_us_other_shipper}
                          referralCode={form.draft.referral_code}
                          terms={form.draft.terms}
                          lang={lang}
                          onChange={(patch) => form.updateDraft(patch)}
                          errors={form.fieldErrors}
                          disabled={form.busy}
                          includeTerms={false}
                        />
                      </section>

                      <section className="shipper-register-section" aria-labelledby="register-kyc-heading">
                        <h2 id="register-kyc-heading" className="shipper-register-section-title">
                          {t('registerSectionVerifiedUser', 'Sign Up as a Verified User')}
                        </h2>
                        <KycStep
                          vat={form.draft.kyc_vat_number_shipper}
                          certificate={form.certificateFile}
                          onVat={(v) => form.updateDraft({ kyc_vat_number_shipper: v })}
                          onCertificate={form.setCertificate}
                          onSoftVerifyVat={() => void form.softVerifyVat()}
                          vatHint={form.vatHint}
                          vatChecking={form.vatChecking}
                          errors={form.fieldErrors}
                          disabled={form.busy}
                        />
                      </section>

                      <RegisterTermsCheckbox
                        terms={form.draft.terms}
                        lang={lang}
                        onChange={(terms) => form.updateDraft({ terms })}
                        error={form.fieldErrors.terms}
                        disabled={form.busy}
                      />

                      <div className="shipper-login-submit-wrap shipper-register-submit-wrap">
                        <button
                          type="button"
                          className="shipper-login-submit-btn"
                          disabled={form.busy}
                          onClick={() => void form.submitRegister()}
                        >
                          {form.busy
                            ? t('registerWorking', 'Please wait…')
                            : t('registerJoinForFree', 'Join for free')}
                        </button>
                      </div>

                      <div className="shipper-login-join-wrap">
                        <Link to="/login" className="shipper-login-join">
                          {t('registerBackToLogin', 'Back to login')}
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {form.otpModal === 'phone' && (
        <VerifyOtpModal
          mode="phone"
          target={`${form.draft.country_code} ${form.draft.phone}`}
          otp={form.phoneOtp}
          onOtp={form.setPhoneOtp}
          verified={form.draft.phoneVerified}
          onResend={() => void form.resendPhoneCode()}
          onClose={form.closeOtpModal}
          onVerify={() => void form.verifyPhone(form.phoneOtp)}
          resendSeconds={form.resendSeconds}
          busy={form.busy}
          error={form.fieldErrors.otp}
        />
      )}

      {form.otpModal === 'email' && (
        <VerifyOtpModal
          mode="email"
          target={form.draft.email}
          otp={form.emailOtp}
          onOtp={form.setEmailOtp}
          verified={form.draft.emailVerified}
          onResend={() => void form.resendEmailCode()}
          onClose={form.closeOtpModal}
          onVerify={() => void form.verifyEmail(form.emailOtp)}
          resendSeconds={form.resendSeconds}
          busy={form.busy}
          error={form.fieldErrors.otp}
        />
      )}
    </div>
  );
};
