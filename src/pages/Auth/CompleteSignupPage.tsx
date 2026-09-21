import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { authService, signupService, SignupApiError, getStoredToken } from '../../api/auth';
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
import { LegalModal } from '../Register/components/LegalModal';
import { VerifyOtpModal } from '../Register/components/VerifyOtpModal';
import { postAuthDestination } from '../../hooks/postAuthDestination';
import {
  digitsOnlyPhone,
  scrollToFirstRegisterError,
  validateFullRegister,
  validateOtp,
  validatePhoneStep,
  type RegisterFieldErrors,
} from '../Register/registerValidation';
import '../Register/RegisterPage.css';

const RESEND_SECONDS = 30;

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

function extractOtp(res: { otp?: number | string; data?: { otp?: number | string } | null }): string | null {
  const raw = res.otp ?? res.data?.otp;
  return raw == null || raw === '' ? null : String(raw);
}

/** Recovers AuthContext after social OAuth when token exists but user is not hydrated yet. */
const SocialSignupSessionRecovery: React.FC = () => {
  const { refreshUser } = useAuth();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await refreshUser();
        if (!cancelled && !profile) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  if (failed) {
    return <Navigate to="/login?social_error=1" replace />;
  }

  return <MyVagonBootScreen />;
};

/**
 * Social complete-signup — same layout/fields as RegisterPage (minus password).
 * Phone shows Verified only when fetched from Google/Microsoft (or OTP-verified).
 * Email is always verified from social login.
 */
export const CompleteSignupPage: React.FC = () => {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const { lang, setLang, showToast } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromParam = searchParams.get('from');
  const browsePath =
    fromParam && fromParam.startsWith('/') && !fromParam.startsWith('//') && !fromParam.startsWith('/complete-signup')
      ? fromParam
      : '/dashboard';

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
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [countriesDomicile, setCountriesDomicile] = useState<SignupReferenceDomicile[]>([]);
  const [signupLinks, setSignupLinks] = useState<SignupReferenceData['links'] | null>(null);
  const [signupLegal, setSignupLegal] = useState<SignupReferenceData['legal'] | null>(null);
  const [signupVideos, setSignupVideos] = useState<{ shipper?: string; carrier?: string }>({});
  const [legalDocModal, setLegalDocModal] = useState<'terms' | 'privacy' | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpResentFlash, setOtpResentFlash] = useState(false);
  const verifiedPhoneRef = useRef<string | null>(null);
  const verifiedCountryCodeRef = useRef<string | null>(null);
  const verifyingPhoneRef = useRef(false);
  const prefilledFromSocialRef = useRef(false);

  const emailVerified = true;

  useEffect(() => {
    if (!user || prefilledFromSocialRef.current) return;
    const socialPhone = digitsOnlyPhone(user.phone || '').slice(0, 10);
    const socialCode = user.country_code || '+30';
    const socialVerified = Boolean(socialPhone && user.phone_verified);

    setForm((prev) => ({
      ...prev,
      first_name: prev.first_name || user.first_name || '',
      last_name: prev.last_name || user.last_name || '',
      company_name: prev.company_name || user.company_name || '',
      country_code: socialPhone ? socialCode : prev.country_code || '+30',
      phone: socialPhone || prev.phone || '',
    }));

    if (socialVerified) {
      setPhoneVerified(true);
      verifiedPhoneRef.current = socialPhone;
      verifiedCountryCodeRef.current = socialCode;
    }
    prefilledFromSocialRef.current = true;
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
        setSignupVideos({
          shipper: ref.videos?.shipper,
          carrier: ref.videos?.carrier,
        });
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
    const timer = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
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

  const setPhone = useCallback(
    (phone: string) => {
      const digits = digitsOnlyPhone(phone).slice(0, 10);
      const restored =
        Boolean(verifiedPhoneRef.current) &&
        digits === verifiedPhoneRef.current &&
        form.country_code === verifiedCountryCodeRef.current;
      setPhoneVerified(restored);
      patch({ phone: digits });
      if (otpModalOpen) setOtpModalOpen(false);
    },
    [form.country_code, otpModalOpen, patch],
  );

  const setCountryCode = useCallback(
    (country_code: string) => {
      const restored =
        Boolean(verifiedPhoneRef.current) &&
        form.phone === verifiedPhoneRef.current &&
        country_code === verifiedCountryCodeRef.current;
      setPhoneVerified(restored);
      patch({ country_code });
      if (otpModalOpen) setOtpModalOpen(false);
    },
    [form.phone, otpModalOpen, patch],
  );

  const openPhoneOtp = useCallback(async () => {
    if (phoneVerified) return;
    const errors = validatePhoneStep(form.country_code, form.phone, t);
    if (Object.keys(errors).length) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setPhoneBusy(true);
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const res = await signupService.sendPhoneOtp({
        country_code: form.country_code,
        phone: digitsOnlyPhone(form.phone),
        user_type: 'shipper',
      });
      setPendingPhoneOtp(extractOtp(res));
      setPhoneOtp('');
      setPhoneVerified(false);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        delete next.otp;
        return next;
      });
      setResendSeconds(RESEND_SECONDS);
      setOtpModalOpen(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('registerPhoneOtpSendFailed', 'Could not send phone OTP');
      const apiFields = err instanceof SignupApiError ? err.fieldErrors : undefined;
      setFieldErrors((prev) => ({
        ...prev,
        phone: apiFields?.phone || message,
      }));
    } finally {
      setPhoneBusy(false);
    }
  }, [form.country_code, form.phone, phoneVerified, t]);

  const resendPhoneCode = useCallback(async () => {
    if (resendSeconds > 0 || phoneBusy) return;
    setPhoneBusy(true);
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const res = await signupService.sendPhoneOtp({
        country_code: form.country_code,
        phone: digitsOnlyPhone(form.phone),
        user_type: 'shipper',
      });
      setPendingPhoneOtp(extractOtp(res));
      setPhoneOtp('');
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        return next;
      });
      setOtpResentFlash(true);
      setResendSeconds(RESEND_SECONDS);
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        otp:
          err instanceof Error
            ? err.message
            : t('registerPhoneOtpSendFailed', 'Could not send phone OTP'),
      }));
    } finally {
      setPhoneBusy(false);
    }
  }, [resendSeconds, phoneBusy, form.country_code, form.phone, t]);

  const verifyPhone = useCallback(
    async (otp: string) => {
      const otpError = validateOtp(otp, t);
      if (otpError) {
        setFieldErrors((prev) => ({ ...prev, otp: otpError }));
        return false;
      }
      if (verifyingPhoneRef.current || phoneVerified) {
        if (phoneVerified) setOtpModalOpen(false);
        return phoneVerified;
      }
      verifyingPhoneRef.current = true;
      setPhoneBusy(true);
      setFormError(null);
      try {
        const useClientCompare = Boolean(pendingPhoneOtp);
        if (useClientCompare) {
          if (String(pendingPhoneOtp) !== otp) {
            setFieldErrors((prev) => ({
              ...prev,
              otp: t('registerOtpInvalid', 'Enter valid OTP'),
            }));
            setPhoneOtp('');
            return false;
          }
        } else {
          await signupService.verifyPhoneOtp({
            country_code: form.country_code,
            phone: digitsOnlyPhone(form.phone),
            otp,
          });
        }

        verifiedPhoneRef.current = digitsOnlyPhone(form.phone);
        verifiedCountryCodeRef.current = form.country_code;
        setPhoneVerified(true);
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.otp;
          delete next.phone;
          return next;
        });
        setOtpModalOpen(false);
        setOtpResentFlash(false);
        return true;
      } catch (err) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: err instanceof Error ? err.message : t('registerOtpInvalid', 'Enter valid OTP'),
        }));
        setPhoneOtp('');
        setPhoneVerified(false);
        return false;
      } finally {
        verifyingPhoneRef.current = false;
        setPhoneBusy(false);
      }
    },
    [t, phoneVerified, form.country_code, form.phone, pendingPhoneOtp],
  );

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
        emailVerified,
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
      const profile = await authService.me();
      showToast(
        t('signupComplete.success', {
          defaultValue: 'Company information saved. KYC is pending review.',
        }),
        'success',
      );
      // Reset document scroll before entering AppLayout — avoids blank space under Info Form after social signup.
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      navigate(profile ? postAuthDestination(profile) : '/dashboard', { replace: true });
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

  const backToApp = useCallback(() => {
    if (submitting || phoneBusy) return;
    navigate(browsePath);
  }, [submitting, phoneBusy, navigate, browsePath]);

  if (isLoading || referenceLoading) {
    return <MyVagonBootScreen />;
  }

  // Social OAuth handoff: token is in storage before AuthContext user commits.
  // Wait for refresh instead of bouncing to /login (that was dropping complete-signup).
  if (!isAuthenticated) {
    if (getStoredToken()) {
      return <SocialSignupSessionRecovery />;
    }
    return <Navigate to="/login" replace />;
  }

  if (user && user.signup_complete !== false) {
    return <Navigate to={postAuthDestination(user)} replace />;
  }

  return (
    <RegisterLayout
      lang={lang}
      onLangChange={(next) => {
        setLang(next);
        void i18n.changeLanguage(next);
      }}
      subtitle={t('registerSubtitle', 'Please enter your details for joining with us.')}
      title={t('signupComplete.title', { defaultValue: 'Complete company information' })}
      variant="shipper"
      videoSrc={signupVideos.shipper}
      onLogoClick={backToApp}
    >
      <form className="reg-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        {formError && (
          <p className="reg-error" role="alert" style={{ marginBottom: '0.75rem' }}>
            {formError}
          </p>
        )}

        {user?.email && (
          <p className="reg-hint" style={{ marginBottom: '0.75rem' }}>
            {t('signupComplete.emailLocked', {
              email: user.email,
              defaultValue: `Signed in as ${user.email}`,
            })}
          </p>
        )}

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

        <CompanyStep
          companyName={form.company_name}
          onCompanyName={(v) => patch({ company_name: v })}
          error={fieldErrors.company_name}
          disabled={submitting}
        />

        <div className="reg-field reg-contact" data-reg-field="phone">
          <div className="reg-phone-field">
            <div className="reg-code-select" data-reg-field="country_code">
              <CountryCodeSelect
                value={form.country_code}
                options={countryCodes}
                onChange={setCountryCode}
                disabled={submitting || phoneBusy}
                error={fieldErrors.country_code}
                verified={phoneVerified}
              />
            </div>
            <div className="reg-phone-input">
              <input
                id="complete-signup-phone"
                className={`reg-input${phoneVerified ? ' is-verified' : ''}`}
                type="tel"
                inputMode="numeric"
                value={form.phone}
                disabled={submitting || phoneBusy}
                autoComplete="tel-national"
                onChange={(e) => setPhone(e.target.value)}
                placeholder={`${t('registerPhone', 'Mobile phone')}*`}
                maxLength={10}
                aria-label={t('registerPhone', 'Mobile phone')}
              />
              {phoneVerified ? (
                <button type="button" className="reg-btn-verify reg-btn-verified" disabled>
                  {t('registerVerifiedBadge', 'Verified')}
                </button>
              ) : (
                <button
                  type="button"
                  className="reg-btn-verify"
                  disabled={submitting || phoneBusy}
                  onClick={() => void openPhoneOtp()}
                >
                  {phoneBusy
                    ? t('registerWorking', 'Please wait…')
                    : t('registerVerify', 'Verify')}
                </button>
              )}
              {fieldErrors.phone && (
                <p className="reg-error" role="alert">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="reg-field reg-contact" data-reg-field="email">
          <input
            id="complete-signup-email"
            className="reg-input is-verified"
            type="email"
            value={user?.email || ''}
            disabled
            autoComplete="email"
            placeholder={`${t('registerEmail', 'Work email')}*`}
            aria-label={t('registerEmail', 'Work email')}
          />
          <button type="button" className="reg-btn-verify reg-btn-verified" disabled>
            {t('registerVerifiedBadge', 'Verified')}
          </button>
        </div>

        <h5 className="reg-section-title mt">
          {t('registerSectionAddress', 'Address')}
        </h5>
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

        <button type="submit" className="reg-btn-primary" disabled={submitting || phoneBusy}>
          {submitting
            ? t('registerWorking', 'Please wait…')
            : t('signupComplete.submit', { defaultValue: 'Save & continue' })}
        </button>

        <div className="reg-footer">
          <button
            type="button"
            disabled={submitting || phoneBusy}
            onClick={backToApp}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: 'inherit',
              cursor: 'pointer',
              textDecoration: 'underline',
              font: 'inherit',
            }}
          >
            {t('signupComplete.backToApp', { defaultValue: 'Back to dashboard' })}
          </button>
        </div>
      </form>

      <LegalModal
        document={legalDocModal}
        legalData={signupLegal}
        onClose={() => setLegalDocModal(null)}
      />

      {otpModalOpen && (
        <VerifyOtpModal
          mode="phone"
          target={`${form.country_code}  ${form.phone}`}
          otp={phoneOtp}
          onOtp={setPhoneOtp}
          verified={phoneVerified}
          onResend={() => void resendPhoneCode()}
          onClose={() => setOtpModalOpen(false)}
          onVerify={() => void verifyPhone(phoneOtp)}
          resendSeconds={resendSeconds}
          busy={phoneBusy}
          error={fieldErrors.otp}
          debugOtp={pendingPhoneOtp}
          resentFlash={otpResentFlash}
        />
      )}
    </RegisterLayout>
  );
};
