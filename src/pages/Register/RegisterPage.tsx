import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import './RegisterPage.css';
import { SIGNUP_QUERY_STORAGE_KEY } from './signupDraft';
import { useRegisterForm } from './useRegisterForm';
import { RegisterLayout } from './RegisterLayout';
import { CountryCodeSelect } from './components/CountryCodeSelect';
import { VerifyOtpModal } from './components/VerifyOtpModal';
import { RegisterSuccessModal } from './components/RegisterSuccessModal';
import { LegalModal } from './components/LegalModal';
import { NameStep } from './steps/NameStep';
import { PasswordStep } from './steps/PasswordStep';
import { CompanyStep } from './steps/CompanyStep';
import { AddressStep } from './steps/AddressStep';
import { MarketingTermsStep, RegisterTermsCheckbox } from './steps/MarketingTermsStep';
import { KycStep } from './steps/KycStep';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import '../../components/auth/SocialAuthButtons.css';

export { SIGNUP_QUERY_STORAGE_KEY };

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [legalDocModal, setLegalDocModal] = useState<'terms' | 'privacy' | null>(null);
  const form = useRegisterForm(t, lang);

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

  const handleLanguageChange = (next: 'en' | 'el') => {
    if (next === lang) return;
    setLang(next);
    void i18n.changeLanguage(next);
  };

  return (
    <RegisterLayout
      lang={lang}
      onLangChange={handleLanguageChange}
      subtitle={t('registerSubtitle', 'Please enter your details for joining with us.')}
      title={t('registerShipperTitle', 'Shipper Sign Up')}
      variant="shipper"
      videoSrc={form.signupVideos.shipper}
    >
      <div className="reg-form">
        {form.formError && (
          <p className="reg-error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {form.formError}
          </p>
        )}

        <SocialAuthButtons compact disabled={form.busy} />

        <div className="social-auth-divider" role="separator" style={{ margin: '0.75rem 0 1rem' }}>
          <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            {t('socialAuth.orSignUpWithEmail', { defaultValue: 'Or sign up with email' })}
          </span>
        </div>

        <h5 className="reg-section-title">
          {t('registerSectionAccount', 'Account & User Info')}
        </h5>

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

          <div className="reg-field reg-contact" data-reg-field="phone">
            <div className="reg-phone-field">
              <div className="reg-code-select" data-reg-field="country_code">
                <CountryCodeSelect
                  value={form.draft.country_code}
                  options={form.countryCodes}
                  onChange={form.setCountryCode}
                  disabled={form.busy || form.phoneBusy}
                  error={form.fieldErrors.country_code}
                  verified={form.draft.phoneVerified}
                />
              </div>
              <div className="reg-phone-input">
                <input
                  id="register-phone"
                  className={`reg-input${form.draft.phoneVerified ? ' is-verified' : ''}`}
                  type="tel"
                  inputMode="numeric"
                  value={form.draft.phone}
                  disabled={form.busy || form.phoneBusy}
                  autoComplete="tel-national"
                  onChange={(e) => form.setPhone(e.target.value)}
                  placeholder={`${t('registerPhone', 'Mobile phone')}*`}
                  maxLength={10}
                  aria-label={t('registerPhone', 'Mobile phone')}
                />
                {form.draft.phoneVerified ? (
                  <button type="button" className="reg-btn-verify reg-btn-verified" disabled>
                    {t('registerVerifiedBadge', 'Verified')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="reg-btn-verify"
                    disabled={form.busy || form.phoneBusy}
                    onClick={() => void form.openPhoneOtp()}
                  >
                    {form.phoneBusy
                      ? t('registerWorking', 'Please wait…')
                      : t('registerVerify', 'Verify')}
                  </button>
                )}
                {form.fieldErrors.phone && (
                  <p className="reg-error" role="alert">
                    {form.fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="reg-field reg-contact" data-reg-field="email">
            <input
              id="register-email"
              className={`reg-input${form.draft.emailVerified ? ' is-verified' : ''}`}
              type="email"
              value={form.draft.email}
              disabled={form.busy || form.emailBusy}
              autoComplete="email"
              onChange={(e) => form.setEmail(e.target.value)}
              placeholder={`${t('registerEmail', 'Work email')}*`}
              aria-label={t('registerEmail', 'Work email')}
            />
            {form.draft.emailVerified ? (
              <button type="button" className="reg-btn-verify reg-btn-verified" disabled>
                {t('registerVerifiedBadge', 'Verified')}
              </button>
            ) : (
              <button
                type="button"
                className="reg-btn-verify"
                disabled={form.busy || form.emailBusy}
                onClick={() => void form.openEmailOtp()}
              >
                {form.emailBusy
                  ? t('registerWorking', 'Please wait…')
                  : t('registerVerify', 'Verify')}
              </button>
            )}
            {form.fieldErrors.email && (
              <p className="reg-error" role="alert">
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

          <h5 className="reg-section-title mt">
            {t('registerSectionAddress', 'Address')}
          </h5>
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
            links={form.signupLinks}
            onOpenLegal={setLegalDocModal}
          />

          <h5 className="reg-section-title mt">
            {t('registerSectionVerifiedUser', 'Sign Up as a Verified User')}
          </h5>
          <KycStep
            vat={form.draft.kyc_vat_number_shipper}
            certificate={form.certificateFile}
            onVat={(v) => form.updateDraft({ kyc_vat_number_shipper: v })}
            onCertificate={form.setCertificate}
            errors={form.fieldErrors}
            disabled={form.busy}
          />

          <RegisterTermsCheckbox
            terms={form.draft.terms}
            lang={lang}
            onChange={(terms) => form.updateDraft({ terms })}
            error={form.fieldErrors.terms}
            disabled={form.busy}
            links={form.signupLinks}
            onOpenLegal={setLegalDocModal}
          />

          <button
            type="button"
            className="reg-btn-primary"
            disabled={form.busy}
            onClick={() => void form.submitRegister()}
          >
            {form.busy
              ? t('registerWorking', 'Please wait…')
              : t('registerJoinForFree', 'Join for free')}
          </button>

          <div className="reg-footer">
            <h4>{t('registerHaveAccount', 'Have an account already?')}</h4>
            <Link to="/login">{t('registerLogIn', 'Log In')}</Link>
          </div>
        </div>

      {form.submitted && (
        <RegisterSuccessModal
          messageHtml={form.successMessage}
          onClose={() => navigate('/login')}
        />
      )}

      {form.otpModal === 'phone' && (
        <VerifyOtpModal
          mode="phone"
          target={`${form.draft.country_code}  ${form.draft.phone}`}
          otp={form.phoneOtp}
          onOtp={form.setPhoneOtp}
          verified={form.draft.phoneVerified}
          onResend={() => void form.resendPhoneCode()}
          onClose={form.closeOtpModal}
          onVerify={() => void form.verifyPhone(form.phoneOtp)}
          resendSeconds={form.resendSeconds}
          busy={form.phoneBusy}
          error={form.fieldErrors.otp}
          debugOtp={form.showOtpDebug ? form.pendingPhoneOtp : null}
          resentFlash={form.otpResentFlash}
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
          busy={form.emailBusy}
          error={form.fieldErrors.otp}
          debugOtp={form.showOtpDebug ? form.pendingEmailOtp : null}
          resentFlash={form.otpResentFlash}
        />
      )}

      <LegalModal
        document={legalDocModal}
        legalData={form.signupLegal}
        onClose={() => setLegalDocModal(null)}
      />
    </RegisterLayout>
  );
};
