import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { authService, signupService, SignupApiError } from '../../api/auth';
import type {
  SignupReferenceCountryCode,
  SignupReferenceDomicile,
  SignupReferenceData,
} from '../../api/auth';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import { RegisterLayout } from '../Register/RegisterLayout';
import { NameStep } from '../Register/steps/NameStep';
import { CompanyStep } from '../Register/steps/CompanyStep';
import { AddressStep } from '../Register/steps/AddressStep';
import { MarketingTermsStep, RegisterTermsCheckbox } from '../Register/steps/MarketingTermsStep';
import { KycStep } from '../Register/steps/KycStep';
import { CountryCodeSelect } from '../Register/components/CountryCodeSelect';
import { VerifyOtpModal } from '../Register/components/VerifyOtpModal';
import { LegalModal } from '../Register/components/LegalModal';
import {
  digitsOnlyPhone,
  scrollToFirstRegisterError,
  validateFullRegister,
  validateOtp,
  validatePhoneStep,
  type RegisterFieldErrors,
} from '../Register/registerValidation';
import '../Register/RegisterPage.css';

type FormState = {
  first_name: string;
  last_name: string;
  company_name: string;
  country_code: string;
  phone: string;
  street_address: string;
  address_line_2: string;
  city: string;
  address_country: string;
  postal_code: string;
  lat: string;
  lng: string;
  hear_about_us_shipper: string;
  hear_about_us_other_shipper: string;
  referral_code: string;
  terms: boolean;
  kyc_vat_number_shipper: string;
};

function isClientOtpEnv(): boolean {
  const mode = import.meta.env.MODE;
  return (
    import.meta.env.DEV ||
    mode === 'development' ||
    mode === 'staging' ||
    mode === 'local'
  );
}

function extractOtp(res: { otp?: number | string; data?: { otp?: number | string } | null }): string | null {
  if (res.otp != null && String(res.otp).trim() !== '') return String(res.otp);
  if (res.data?.otp != null && String(res.data.otp).trim() !== '') return String(res.data.otp);
  return null;
}

export const CompleteSignupPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const { lang, setLang, showToast } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    company_name: '',
    country_code: '+30',
    phone: '',
    street_address: '',
    address_line_2: '',
    city: '',
    address_country: '',
    postal_code: '',
    lat: '',
    lng: '',
    hear_about_us_shipper: '',
    hear_about_us_other_shipper: '',
    referral_code: '',
    terms: false,
    kyc_vat_number_shipper: '',
  });
  const [certificate, setCertificate] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [countriesDomicile, setCountriesDomicile] = useState<SignupReferenceDomicile[]>([]);
  const [signupLinks, setSignupLinks] = useState<SignupReferenceData['links'] | null>(null);
  const [signupLegal, setSignupLegal] = useState<SignupReferenceData['legal'] | null>(null);
  const [legalDocModal, setLegalDocModal] = useState<'terms' | 'privacy' | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      first_name: prev.first_name || user.first_name || '',
      last_name: prev.last_name || user.last_name || '',
      company_name: prev.company_name || user.company_name || '',
    }));
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = await signupService.getReference(lang);
        if (cancelled) return;
        setCountryCodes(ref.country_codes || []);
        setCountriesDomicile(ref.countries_domicile || []);
        setSignupLinks(ref.links || null);
        setSignupLegal(ref.legal || null);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReferenceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  const patch = useCallback((partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(partial) as Array<keyof FormState>) {
        delete next[key as keyof RegisterFieldErrors];
      }
      return next;
    });
  }, []);

  const sendPhoneOtp = async () => {
    const errors = validatePhoneStep(form.country_code, form.phone, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      scrollToFirstRegisterError(errors);
      return;
    }
    setFormError(null);
    setPhoneBusy(true);
    try {
      const res = await signupService.sendPhoneOtp({
        country_code: form.country_code,
        phone: digitsOnlyPhone(form.phone),
      });
      if (isClientOtpEnv()) {
        setPendingPhoneOtp(extractOtp(res));
      }
      setPhoneOtp('');
      setOtpModal(true);
      setResendSeconds(30);
      setPhoneVerified(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setPhoneBusy(false);
    }
  };

  const verifyPhone = async () => {
    const otpErr = validateOtp(phoneOtp, t);
    if (otpErr) {
      setFieldErrors((prev) => ({ ...prev, otp: otpErr }));
      return;
    }
    setPhoneBusy(true);
    try {
      if (isClientOtpEnv() && pendingPhoneOtp && phoneOtp.trim() !== pendingPhoneOtp) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: t('registerOtpInvalid', 'Invalid verification code'),
        }));
        return;
      }
      if (!isClientOtpEnv()) {
        await signupService.verifyPhoneOtp({
          country_code: form.country_code,
          phone: digitsOnlyPhone(form.phone),
          otp: phoneOtp.trim(),
        });
      }
      setPhoneVerified(true);
      setOtpModal(false);
      showToast(t('registerPhoneVerified', 'Phone verified'), 'success');
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        otp: err instanceof Error ? err.message : 'Invalid code',
      }));
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = validateFullRegister(
      {
        first_name: form.first_name,
        last_name: form.last_name,
        company_name: form.company_name,
        country_code: form.country_code,
        phone: form.phone,
        phoneVerified,
        email: user?.email || 'verified@social.local',
        emailVerified: true,
        password: 'Social1!x',
        password_confirmation: 'Social1!x',
        street_address: form.street_address,
        postal_code: form.postal_code,
        city: form.city,
        address_country: form.address_country,
        hear_about_us_shipper: form.hear_about_us_shipper,
        hear_about_us_other_shipper: form.hear_about_us_other_shipper,
        referral_code: form.referral_code,
        terms: form.terms,
        kyc_vat_number_shipper: form.kyc_vat_number_shipper,
      },
      certificate,
      t,
    );
    delete errors.password;
    delete errors.password_confirmation;
    delete errors.email;

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      scrollToFirstRegisterError(errors);
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('first_name', form.first_name.trim());
      body.append('last_name', form.last_name.trim());
      body.append('company_name', form.company_name.trim());
      body.append('country_code', form.country_code);
      body.append('phone', digitsOnlyPhone(form.phone));
      body.append('kyc_vat_number_shipper', form.kyc_vat_number_shipper.trim());
      body.append('street_address', form.street_address.trim());
      if (form.address_line_2) body.append('address_line_2', form.address_line_2);
      body.append('city', form.city.trim());
      body.append('address_country', form.address_country);
      body.append('postal_code', form.postal_code.trim());
      if (form.lat) body.append('lat', form.lat);
      if (form.lng) body.append('lng', form.lng);
      if (form.hear_about_us_shipper) body.append('hear_about_us_shipper', form.hear_about_us_shipper);
      if (form.hear_about_us_other_shipper) {
        body.append('hear_about_us_other_shipper', form.hear_about_us_other_shipper);
      }
      if (form.referral_code) body.append('referral_code', form.referral_code);
      body.append('terms', '1');
      if (certificate) body.append('shipper_certificate', certificate);

      await authService.completeSignup(body);
      await refreshUser();
      showToast(
        t('signupComplete.success', { defaultValue: 'Company information saved.' }),
        'success',
      );
      navigate(from.startsWith('/') ? from : '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof SignupApiError) {
        setFieldErrors(err.fieldErrors);
        setFormError(err.message);
        scrollToFirstRegisterError(err.fieldErrors);
      } else {
        setFormError(err instanceof Error ? err.message : 'Could not save');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || referenceLoading) {
    return <MyVagonBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.signup_complete !== false) {
    return <Navigate to={from.startsWith('/') ? from : '/dashboard'} replace />;
  }

  return (
    <RegisterLayout
      lang={lang}
      onLangChange={(next) => {
        setLang(next);
        void i18n.changeLanguage(next);
      }}
      subtitle={t('signupComplete.subtitle', {
        defaultValue:
          'Finish your company profile to start creating shipments and managing your account.',
      })}
      title={t('signupComplete.title', { defaultValue: 'Complete company information' })}
      variant="shipper"
    >
      <form className="reg-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        {formError && (
          <p className="reg-error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {formError}
          </p>
        )}

        <p className="reg-hint" style={{ marginBottom: '1rem' }}>
          {t('signupComplete.emailLocked', {
            defaultValue: `Signed in as ${user?.email ?? ''}`,
            email: user?.email,
          })}
        </p>

        <h5 className="reg-section-title">
          {t('registerSectionAccount', 'Account & User Info')}
        </h5>

        <NameStep
          firstName={form.first_name}
          lastName={form.last_name}
          onFirstName={(v) => patch({ first_name: v })}
          onLastName={(v) => patch({ last_name: v })}
          errors={{ first_name: fieldErrors.first_name, last_name: fieldErrors.last_name }}
          disabled={submitting}
        />

        <div className="reg-field" data-reg-field="phone">
          <div className="reg-phone-field">
            <CountryCodeSelect
              value={form.country_code}
              options={countryCodes}
              disabled={submitting || phoneVerified}
              verified={phoneVerified}
              onChange={(v) => {
                patch({ country_code: v });
                setPhoneVerified(false);
              }}
            />
            <div className="reg-phone-input">
              <input
                className="reg-input"
                value={form.phone}
                disabled={submitting || phoneVerified}
                onChange={(e) => {
                  patch({ phone: e.target.value });
                  setPhoneVerified(false);
                }}
                placeholder={`${t('registerPhone', 'Mobile phone')}*`}
              />
              <button
                type="button"
                className="reg-btn-secondary"
                disabled={submitting || phoneBusy}
                onClick={() => void sendPhoneOtp()}
              >
                {phoneVerified
                  ? t('registerVerified', 'Verified')
                  : t('registerVerify', 'Verify')}
              </button>
            </div>
          </div>
          {(fieldErrors.phone || fieldErrors.country_code) && (
            <p className="reg-error" role="alert">
              {fieldErrors.phone || fieldErrors.country_code}
            </p>
          )}
        </div>

        <h5 className="reg-section-title">{t('registerSectionCompany', 'Company Info')}</h5>

        <CompanyStep
          companyName={form.company_name}
          onCompanyName={(v) => patch({ company_name: v })}
          error={fieldErrors.company_name}
          disabled={submitting}
        />

        <AddressStep
          streetAddress={form.street_address}
          addressLine2={form.address_line_2}
          postalCode={form.postal_code}
          city={form.city}
          addressCountry={form.address_country}
          lat={form.lat}
          lng={form.lng}
          countriesDomicile={countriesDomicile}
          onChange={(p) => patch(p)}
          errors={{
            street_address: fieldErrors.street_address,
            postal_code: fieldErrors.postal_code,
            city: fieldErrors.city,
            address_country: fieldErrors.address_country,
          }}
          disabled={submitting}
        />

        <MarketingTermsStep
          hearAbout={form.hear_about_us_shipper}
          hearAboutOther={form.hear_about_us_other_shipper}
          referralCode={form.referral_code}
          terms={form.terms}
          lang={lang}
          includeTerms={false}
          links={signupLinks}
          onChange={(p) =>
            patch({
              hear_about_us_shipper: p.hear_about_us_shipper ?? form.hear_about_us_shipper,
              hear_about_us_other_shipper:
                p.hear_about_us_other_shipper ?? form.hear_about_us_other_shipper,
              referral_code: p.referral_code ?? form.referral_code,
              terms: p.terms ?? form.terms,
            })
          }
          errors={{
            hear_about_us_shipper: fieldErrors.hear_about_us_shipper,
            hear_about_us_other_shipper: fieldErrors.hear_about_us_other_shipper,
            referral_code: fieldErrors.referral_code,
          }}
          disabled={submitting}
          onOpenLegal={setLegalDocModal}
        />

        <h5 className="reg-section-title mt">
          {t('registerSectionVerifiedUser', 'Sign Up as a Verified User')}
        </h5>

        <KycStep
          vat={form.kyc_vat_number_shipper}
          certificate={certificate}
          onVat={(v) => patch({ kyc_vat_number_shipper: v })}
          onCertificate={setCertificate}
          errors={{
            kyc_vat_number_shipper: fieldErrors.kyc_vat_number_shipper,
            shipper_certificate: fieldErrors.shipper_certificate,
          }}
          disabled={submitting}
        />

        <RegisterTermsCheckbox
          terms={form.terms}
          lang={lang}
          onChange={(terms) => patch({ terms })}
          error={fieldErrors.terms}
          disabled={submitting}
          links={signupLinks}
          onOpenLegal={setLegalDocModal}
        />

        <button type="submit" className="reg-btn-primary" disabled={submitting}>
          {submitting
            ? t('signupComplete.saving', { defaultValue: 'Saving…' })
            : t('signupComplete.submit', { defaultValue: 'Save & continue' })}
        </button>
      </form>

      {otpModal && (
        <VerifyOtpModal
          mode="phone"
          target={`${form.country_code}  ${form.phone}`}
          otp={phoneOtp}
          onOtp={setPhoneOtp}
          verified={phoneVerified}
          onResend={() => void sendPhoneOtp()}
          onClose={() => setOtpModal(false)}
          onVerify={() => void verifyPhone()}
          resendSeconds={resendSeconds}
          busy={phoneBusy}
          error={fieldErrors.otp}
          debugOtp={isClientOtpEnv() ? pendingPhoneOtp : null}
        />
      )}

      <LegalModal
        document={legalDocModal}
        legalData={signupLegal}
        onClose={() => setLegalDocModal(null)}
      />
    </RegisterLayout>
  );
};
