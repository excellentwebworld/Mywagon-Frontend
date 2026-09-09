import { useCallback, useEffect, useRef, useState } from 'react';
import { signupService, SignupApiError } from '../../api/auth';
import type {
  SignupLegalDocument,
  SignupReferenceCountryCode,
  SignupReferenceData,
  SignupReferenceDomicile,
} from '../../api/auth';
import {
  clearSignupDraft,
  createEmptyDraft,
  loadSignupDraft,
  patchSignupDraft,
  type SignupDraft,
} from './signupDraft';
import {
  digitsOnlyPhone,
  scrollToFirstRegisterError,
  validateEmailStep,
  validateFullRegister,
  validateOtp,
  validatePhoneStep,
  type RegisterFieldErrors,
} from './registerValidation';

type Translate = (key: string, fallbackOrOptions?: string | Record<string, unknown>) => string;

/** Blade parity: local / development / staging compare OTP client-side. */
const RESEND_SECONDS = 30;

type BusyKind = null | 'phone' | 'email' | 'submit';

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

export type OtpModalMode = 'phone' | 'email' | null;

export function useRegisterForm(t: Translate, lang: 'en' | 'el' = 'en') {
  const [draft, setDraft] = useState<SignupDraft>(() => loadSignupDraft());
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<BusyKind>(null);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [otpModal, setOtpModal] = useState<OtpModalMode>(null);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [pendingPhoneOtp, setPendingPhoneOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpResentFlash, setOtpResentFlash] = useState(false);
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [countriesDomicile, setCountriesDomicile] = useState<SignupReferenceDomicile[]>([]);
  const [signupVideos, setSignupVideos] = useState<{ shipper?: string; carrier?: string }>({});
  const [signupLinks, setSignupLinks] = useState<SignupReferenceData['links'] | null>(null);
  const [signupLegal, setSignupLegal] = useState<SignupReferenceData['legal'] | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const verifyingPhoneRef = useRef(false);
  const hasLoadedReferenceRef = useRef(false);
  /** Blade shipper_old_email / shipper_old_phone / shipper_old_country_code */
  const verifiedEmailRef = useRef<string>('');
  const verifiedPhoneRef = useRef<string>('');
  const verifiedCountryCodeRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // First load only: show boot screen. Language switches refresh quietly.
      if (!hasLoadedReferenceRef.current) {
        setReferenceLoading(true);
      }
      try {
        const data = await signupService.getReference(lang);
        if (cancelled) return;
        const codes = data.country_codes ?? [];
        const domicile = data.countries_domicile ?? [];
        setCountryCodes(codes);
        setCountriesDomicile(domicile);
        setSignupVideos(data.videos ?? {});
        setSignupLinks(data.links ?? null);
        setSignupLegal(data.legal ?? null);
        if (data.legal?.terms_and_conditions?.content) {
          try {
            sessionStorage.setItem(`legal_terms_and_conditions_${lang}`, data.legal.terms_and_conditions.content);
            sessionStorage.setItem('legal_terms_and_conditions', data.legal.terms_and_conditions.content);
          } catch {
            /* ignore */
          }
        }
        if (data.legal?.privacy_policy?.content) {
          try {
            sessionStorage.setItem(`legal_privacy_policy_${lang}`, data.legal.privacy_policy.content);
            sessionStorage.setItem('legal_privacy_policy', data.legal.privacy_policy.content);
          } catch {
            /* ignore */
          }
        }
        hasLoadedReferenceRef.current = true;
        setDraft((prev) => {
          const patch: Partial<SignupDraft> = {};
          if (!prev.country_code) {
            patch.country_code =
              codes.find((c) => c.code === '+30')?.code || codes[0]?.code || '+30';
          }
          if (!prev.address_country && domicile.length) {
            const greece =
              domicile.find((d) => /greece|ελλάδα/i.test(d.value || d.label))?.value ||
              domicile[0]?.value;
            if (greece) patch.address_country = greece;
          }
          if (Object.keys(patch).length === 0) return prev;
          return patchSignupDraft(prev, patch);
        });
      } catch (err) {
        if (!cancelled && !hasLoadedReferenceRef.current) {
          setFormError(
            err instanceof Error
              ? err.message
              : t('registerReferenceFailed', 'Could not load signup data')
          );
        }
      } finally {
        if (!cancelled) setReferenceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, t]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  const updateDraft = useCallback((patch: Partial<SignupDraft>) => {
    setDraft((prev) => patchSignupDraft(prev, patch));
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof SignupDraft)[]) {
        if (key in next) delete next[key as keyof RegisterFieldErrors];
      }
      return next;
    });
    setFormError(null);
  }, []);

  const clearPhoneOtpState = useCallback(() => {
    setPhoneOtp('');
    setPendingPhoneOtp(null);
    verifyingPhoneRef.current = false;
  }, []);

  const clearEmailOtpState = useCallback(() => {
    setEmailOtp('');
    setPendingEmailOtp(null);
  }, []);

  const closeOtpModal = useCallback(() => {
    setOtpModal(null);
    setOtpResentFlash(false);
    setFieldErrors((prev) => {
      if (!prev.otp) return prev;
      const next = { ...prev };
      delete next.otp;
      return next;
    });
  }, []);

  const setPhone = useCallback(
    (phone: string) => {
      const digits = digitsOnlyPhone(phone).slice(0, 10);
      const restored =
        Boolean(verifiedPhoneRef.current) &&
        digits === verifiedPhoneRef.current &&
        draft.country_code === verifiedCountryCodeRef.current;
      updateDraft({ phone: digits, phoneVerified: restored });
      clearPhoneOtpState();
      if (otpModal === 'phone') setOtpModal(null);
    },
    [updateDraft, clearPhoneOtpState, otpModal, draft.country_code]
  );

  const setCountryCode = useCallback(
    (country_code: string) => {
      const restored =
        Boolean(verifiedPhoneRef.current) &&
        draft.phone === verifiedPhoneRef.current &&
        country_code === verifiedCountryCodeRef.current;
      updateDraft({ country_code, phoneVerified: restored });
      clearPhoneOtpState();
      if (otpModal === 'phone') setOtpModal(null);
    },
    [updateDraft, clearPhoneOtpState, otpModal, draft.phone]
  );

  const setEmail = useCallback(
    (email: string) => {
      const normalized = email.replace(/\s/g, '').toLowerCase();
      const restored =
        Boolean(verifiedEmailRef.current) && normalized === verifiedEmailRef.current;
      updateDraft({ email: normalized, emailVerified: restored });
      clearEmailOtpState();
      if (otpModal === 'email') setOtpModal(null);
    },
    [updateDraft, clearEmailOtpState, otpModal]
  );

  const startResendCooldown = useCallback(() => {
    setResendSeconds(RESEND_SECONDS);
  }, []);

  const openPhoneOtp = useCallback(async () => {
    if (draft.phoneVerified) return;
    const errors = validatePhoneStep(draft.country_code, draft.phone, t);
    if (Object.keys(errors).length) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setBusyKind('phone');
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const res = await signupService.sendPhoneOtp({
        country_code: draft.country_code,
        phone: digitsOnlyPhone(draft.phone),
        user_type: 'shipper',
      });
      setPendingPhoneOtp(extractOtp(res));
      setPhoneOtp('');
      updateDraft({ phoneVerified: false });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        delete next.otp;
        return next;
      });
      startResendCooldown();
      setOtpModal('phone');
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
      setBusyKind(null);
    }
  }, [draft.country_code, draft.phone, draft.phoneVerified, t, updateDraft, startResendCooldown]);

  const resendPhoneCode = useCallback(async () => {
    if (resendSeconds > 0 || busyKind === 'phone') return;
    setBusyKind('phone');
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const res = await signupService.sendPhoneOtp({
        country_code: draft.country_code,
        phone: digitsOnlyPhone(draft.phone),
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
      startResendCooldown();
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        otp:
          err instanceof Error
            ? err.message
            : t('registerPhoneOtpSendFailed', 'Could not send phone OTP'),
      }));
    } finally {
      setBusyKind(null);
    }
  }, [resendSeconds, busyKind, draft.country_code, draft.phone, startResendCooldown, t]);

  const verifyPhone = useCallback(
    async (otp: string) => {
      const otpError = validateOtp(otp, t);
      if (otpError) {
        setFieldErrors((prev) => ({ ...prev, otp: otpError }));
        return false;
      }
      if (verifyingPhoneRef.current || draft.phoneVerified) {
        if (draft.phoneVerified) setOtpModal(null);
        return draft.phoneVerified;
      }
      verifyingPhoneRef.current = true;
      setBusyKind('phone');
      setFormError(null);
      try {
        // Blade: local/dev/staging compare returned OTP; production calls SMS verify API.
        const useClientCompare = Boolean(pendingPhoneOtp) && isClientOtpEnv();
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
            country_code: draft.country_code,
            phone: digitsOnlyPhone(draft.phone),
            otp,
          });
        }

        verifiedPhoneRef.current = digitsOnlyPhone(draft.phone);
        verifiedCountryCodeRef.current = draft.country_code;
        updateDraft({ phoneVerified: true });
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.otp;
          delete next.phone;
          return next;
        });
        setOtpModal(null);
        setOtpResentFlash(false);
        return true;
      } catch (err) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: err instanceof Error ? err.message : t('registerOtpInvalid', 'Enter valid OTP'),
        }));
        setPhoneOtp('');
        updateDraft({ phoneVerified: false });
        return false;
      } finally {
        verifyingPhoneRef.current = false;
        setBusyKind(null);
      }
    },
    [t, draft.phoneVerified, draft.country_code, draft.phone, pendingPhoneOtp, updateDraft]
  );

  const openEmailOtp = useCallback(async () => {
    if (draft.emailVerified) return;
    const errors = validateEmailStep(draft.email, t);
    if (Object.keys(errors).length) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setBusyKind('email');
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const email = draft.email.trim().toLowerCase();
      const res = await signupService.sendEmailOtp({
        email,
        user_type: 'shipper',
      });
      setPendingEmailOtp(extractOtp(res));
      setEmailOtp('');
      updateDraft({ emailVerified: false, email });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        delete next.otp;
        return next;
      });
      startResendCooldown();
      setOtpModal('email');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('registerEmailOtpSendFailed', 'Could not send email OTP');
      const apiFields = err instanceof SignupApiError ? err.fieldErrors : undefined;
      setFieldErrors((prev) => ({
        ...prev,
        email: apiFields?.email || message,
      }));
    } finally {
      setBusyKind(null);
    }
  }, [draft.email, draft.emailVerified, t, updateDraft, startResendCooldown]);

  const resendEmailCode = useCallback(async () => {
    if (resendSeconds > 0 || busyKind === 'email') return;
    setBusyKind('email');
    setFormError(null);
    setOtpResentFlash(false);
    try {
      const res = await signupService.sendEmailOtp({
        email: draft.email.trim().toLowerCase(),
        user_type: 'shipper',
      });
      setPendingEmailOtp(extractOtp(res));
      setEmailOtp('');
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        return next;
      });
      setOtpResentFlash(true);
      startResendCooldown();
    } catch (err) {
      setFieldErrors((prev) => ({
        ...prev,
        otp:
          err instanceof Error
            ? err.message
            : t('registerEmailOtpSendFailed', 'Could not send email OTP'),
      }));
    } finally {
      setBusyKind(null);
    }
  }, [resendSeconds, busyKind, draft.email, startResendCooldown, t]);

  const verifyEmail = useCallback(
    (otp: string) => {
      const otpError = validateOtp(otp, t);
      if (otpError) {
        setFieldErrors((prev) => ({ ...prev, otp: otpError }));
        return false;
      }
      if (draft.emailVerified) {
        setOtpModal(null);
        return true;
      }
      // Blade: email OTP is always compared client-side against send response.
      if (!pendingEmailOtp || String(otp) !== String(pendingEmailOtp)) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: t('registerOtpInvalid', 'Enter valid OTP'),
        }));
        setEmailOtp('');
        updateDraft({ emailVerified: false });
        return false;
      }
      verifiedEmailRef.current = draft.email.trim().toLowerCase();
      updateDraft({ emailVerified: true });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        delete next.email;
        return next;
      });
      setOtpModal(null);
      setOtpResentFlash(false);
      return true;
    },
    [t, draft.emailVerified, draft.email, pendingEmailOtp, updateDraft]
  );

  const setCertificate = useCallback((file: File | null) => {
    setCertificateFile(file);
    setFieldErrors((prev) => {
      if (!prev.shipper_certificate) return prev;
      const next = { ...prev };
      delete next.shipper_certificate;
      return next;
    });
    setFormError(null);
  }, []);

  const submitRegister = useCallback(async () => {
    const errors = validateFullRegister(draft, certificateFile, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError(null);
      window.requestAnimationFrame(() => scrollToFirstRegisterError(errors));
      return;
    }
    if (!certificateFile) return;

    setBusyKind('submit');
    setFormError(null);
    try {
      const companyRes = await signupService.checkCompany({
        table_name: 'shippers',
        field_name: 'company_name',
        new_value: draft.company_name.trim(),
      });
      if (companyRes.status === false || companyRes.success === false) {
        const companyErrors: RegisterFieldErrors = {
          company_name:
            companyRes.message || t('registerCompanyTaken', 'Company name already exists'),
        };
        setFieldErrors(companyErrors);
        setFormError(null);
        window.requestAnimationFrame(() => scrollToFirstRegisterError(companyErrors));
        return;
      }

      const res = await signupService.signup({
        first_name: draft.first_name.trim(),
        last_name: draft.last_name.trim(),
        company_name: draft.company_name.trim(),
        email: draft.email.trim(),
        country_code: draft.country_code,
        phone: digitsOnlyPhone(draft.phone),
        password: draft.password,
        password_confirmation: draft.password_confirmation,
        kyc_vat_number_shipper: draft.kyc_vat_number_shipper.trim(),
        shipper_certificate: certificateFile,
        street_address: draft.street_address.trim(),
        address_line_2: draft.address_line_2.trim() || null,
        city: draft.city.trim(),
        address_country: draft.address_country.trim(),
        postal_code: draft.postal_code.trim(),
        lat: draft.lat || null,
        lng: draft.lng || null,
        hear_about_us_shipper: draft.hear_about_us_shipper || null,
        hear_about_us_other_shipper:
          draft.hear_about_us_shipper === 'Other' ? draft.hear_about_us_other_shipper.trim() : null,
        referral_code: draft.referral_code.trim() || null,
        terms: true,
      });
      setSuccessMessage(res.message || null);
      clearSignupDraft();
      setCertificateFile(null);
      setDraft(createEmptyDraft());
      setOtpModal(null);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof SignupApiError && Object.keys(err.fieldErrors).length > 0) {
        const mapped: RegisterFieldErrors = {};
        for (const [key, message] of Object.entries(err.fieldErrors)) {
          (mapped as Record<string, string>)[key] = message;
        }
        setFieldErrors(mapped);
        setFormError(null);
        window.requestAnimationFrame(() => scrollToFirstRegisterError(mapped));
      } else {
        setFormError(
          err instanceof Error
            ? err.message
            : t('registerSignupFailed', 'Signup failed. Please try again.')
        );
      }
    } finally {
      setBusyKind(null);
    }
  }, [draft, certificateFile, t]);

  // Blade requires clicking Verify — no auto-submit when 6 digits are filled.

  const phoneBusy = busyKind === 'phone';
  const emailBusy = busyKind === 'email';
  const busy = busyKind === 'submit';

  return {
    draft,
    updateDraft,
    setPhone,
    setCountryCode,
    setEmail,
    fieldErrors,
    formError,
    busy,
    phoneBusy,
    emailBusy,
    submitted,
    setSubmitted,
    successMessage,
    referenceLoading,
    countryCodes,
    countriesDomicile,
    signupVideos,
    signupLinks,
    signupLegal,
    otpModal,
    closeOtpModal,
    phoneOtp,
    setPhoneOtp,
    emailOtp,
    setEmailOtp,
    resendSeconds,
    otpResentFlash,
    pendingEmailOtp,
    pendingPhoneOtp,
    showOtpDebug: isClientOtpEnv(),
    openPhoneOtp,
    openEmailOtp,
    resendPhoneCode,
    resendEmailCode,
    verifyPhone,
    verifyEmail,
    certificateFile,
    setCertificate,
    submitRegister,
  };
}
