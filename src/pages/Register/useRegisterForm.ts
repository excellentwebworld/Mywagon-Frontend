import { useCallback, useEffect, useRef, useState } from 'react';
import { signupService, SignupApiError } from '../../api/auth';
import type { SignupReferenceCountryCode, SignupReferenceDomicile } from '../../api/auth';
import {
  clearSignupDraft,
  createEmptyDraft,
  loadSignupDraft,
  patchSignupDraft,
  type SignupDraft,
} from './signupDraft';
import {
  digitsOnlyPhone,
  validateEmailStep,
  validateFullRegister,
  validateOtp,
  validatePhoneStep,
  type RegisterFieldErrors,
} from './registerValidation';

type Translate = (key: string, fallbackOrOptions?: string | Record<string, unknown>) => string;

const RESEND_SECONDS = 60;

export type OtpModalMode = 'phone' | 'email' | null;

export function useRegisterForm(t: Translate) {
  const [draft, setDraft] = useState<SignupDraft>(() => loadSignupDraft());
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [otpModal, setOtpModal] = useState<OtpModalMode>(null);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [countriesDomicile, setCountriesDomicile] = useState<SignupReferenceDomicile[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [vatHint, setVatHint] = useState<string | null>(null);
  const [vatChecking, setVatChecking] = useState(false);
  const verifyingPhoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReferenceLoading(true);
      try {
        const data = await signupService.getReference();
        if (cancelled) return;
        const codes = data.country_codes ?? [];
        const domicile = data.countries_domicile ?? [];
        setCountryCodes(codes);
        setCountriesDomicile(domicile);
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
        if (!cancelled) {
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
  }, [t]);

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
    verifyingPhoneRef.current = false;
  }, []);

  const clearEmailOtpState = useCallback(() => {
    setEmailOtp('');
    setPendingEmailOtp(null);
  }, []);

  const closeOtpModal = useCallback(() => {
    setOtpModal(null);
  }, []);

  const setPhone = useCallback(
    (phone: string) => {
      const digits = digitsOnlyPhone(phone).slice(0, 10);
      updateDraft({ phone: digits, phoneVerified: false });
      clearPhoneOtpState();
      if (otpModal === 'phone') setOtpModal(null);
    },
    [updateDraft, clearPhoneOtpState, otpModal]
  );

  const setCountryCode = useCallback(
    (country_code: string) => {
      updateDraft({ country_code, phoneVerified: false });
      clearPhoneOtpState();
      if (otpModal === 'phone') setOtpModal(null);
    },
    [updateDraft, clearPhoneOtpState, otpModal]
  );

  const setEmail = useCallback(
    (email: string) => {
      updateDraft({ email, emailVerified: false });
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
    setBusy(true);
    setFormError(null);
    try {
      const dup = await signupService.checkDuplicate({
        table_name: 'shippers',
        field_name: 'phone',
        new_value: digitsOnlyPhone(draft.phone),
      });
      if (dup.status === false || dup.success === false) {
        setFieldErrors((prev) => ({
          ...prev,
          phone: dup.message || t('registerPhoneTaken', 'This phone number has already been taken'),
        }));
        return;
      }
      await signupService.sendPhoneOtp({
        country_code: draft.country_code,
        phone: digitsOnlyPhone(draft.phone),
        user_type: 'shipper',
      });
      clearPhoneOtpState();
      updateDraft({ phoneVerified: false });
      startResendCooldown();
      setOtpModal('phone');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerPhoneOtpSendFailed', 'Could not send phone OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [
    draft.country_code,
    draft.phone,
    draft.phoneVerified,
    t,
    clearPhoneOtpState,
    updateDraft,
    startResendCooldown,
  ]);

  const resendPhoneCode = useCallback(async () => {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      await signupService.sendPhoneOtp({
        country_code: draft.country_code,
        phone: digitsOnlyPhone(draft.phone),
        user_type: 'shipper',
      });
      setPhoneOtp('');
      startResendCooldown();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerPhoneOtpSendFailed', 'Could not send phone OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [resendSeconds, busy, draft.country_code, draft.phone, startResendCooldown, t]);

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
      setBusy(true);
      setFormError(null);
      try {
        await signupService.verifyPhoneOtp({
          country_code: draft.country_code,
          phone: digitsOnlyPhone(draft.phone),
          otp,
        });
        updateDraft({ phoneVerified: true });
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.otp;
          delete next.phone;
          return next;
        });
        setOtpModal(null);
        return true;
      } catch (err) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: err instanceof Error ? err.message : t('registerOtpInvalid', 'Enter valid OTP'),
        }));
        updateDraft({ phoneVerified: false });
        return false;
      } finally {
        verifyingPhoneRef.current = false;
        setBusy(false);
      }
    },
    [t, draft.phoneVerified, draft.country_code, draft.phone, updateDraft]
  );

  const openEmailOtp = useCallback(async () => {
    if (draft.emailVerified) return;
    const errors = validateEmailStep(draft.email, t);
    if (Object.keys(errors).length) {
      setFieldErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const dup = await signupService.checkDuplicate({
        table_name: 'shippers',
        field_name: 'email',
        new_value: draft.email.trim(),
      });
      if (dup.status === false || dup.success === false) {
        setFieldErrors((prev) => ({
          ...prev,
          email: dup.message || t('registerEmailTaken', 'Already taken'),
        }));
        return;
      }
      const res = await signupService.sendEmailOtp({
        email: draft.email.trim(),
        user_type: 'shipper',
      });
      setPendingEmailOtp(res.otp != null ? String(res.otp) : null);
      setEmailOtp('');
      updateDraft({ emailVerified: false, email: draft.email.trim() });
      startResendCooldown();
      setOtpModal('email');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerEmailOtpSendFailed', 'Could not send email OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [draft.email, draft.emailVerified, t, updateDraft, startResendCooldown]);

  const resendEmailCode = useCallback(async () => {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await signupService.sendEmailOtp({
        email: draft.email.trim(),
        user_type: 'shipper',
      });
      setPendingEmailOtp(res.otp != null ? String(res.otp) : null);
      setEmailOtp('');
      updateDraft({ emailVerified: false });
      startResendCooldown();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerEmailOtpSendFailed', 'Could not send email OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [resendSeconds, busy, draft.email, startResendCooldown, t, updateDraft]);

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
      if (!pendingEmailOtp || otp !== pendingEmailOtp) {
        setFieldErrors((prev) => ({
          ...prev,
          otp: t('registerOtpInvalid', 'Enter valid OTP'),
        }));
        updateDraft({ emailVerified: false });
        return false;
      }
      updateDraft({ emailVerified: true });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        delete next.email;
        return next;
      });
      setOtpModal(null);
      return true;
    },
    [t, draft.emailVerified, pendingEmailOtp, updateDraft]
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

  const softVerifyVat = useCallback(async () => {
    const vat = draft.kyc_vat_number_shipper.trim();
    if (vat.length < 2) {
      setVatHint(null);
      return;
    }
    setVatChecking(true);
    setVatHint(null);
    try {
      const res = await signupService.verifyVat(vat);
      const valid =
        res.valid === true ||
        res.status === true ||
        res.status === 1 ||
        res.status === '1' ||
        String(res.status).toLowerCase() === 'valid';
      if (valid) {
        setVatHint(t('registerVatVerified', 'VAT number looks valid'));
      } else {
        setVatHint(
          (typeof res.message === 'string' && res.message) ||
            t('registerVatUnverified', 'Could not verify VAT (you can still continue)')
        );
      }
    } catch {
      setVatHint(t('registerVatUnverified', 'Could not verify VAT (you can still continue)'));
    } finally {
      setVatChecking(false);
    }
  }, [draft.kyc_vat_number_shipper, t]);

  const submitRegister = useCallback(async () => {
    const errors = validateFullRegister(draft, certificateFile, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError(t('registerFixErrors', 'Please fix the highlighted fields and try again.'));
      return;
    }
    if (!certificateFile) return;

    setBusy(true);
    setFormError(null);
    try {
      const companyRes = await signupService.checkCompany({
        table_name: 'shippers',
        field_name: 'company_name',
        new_value: draft.company_name.trim(),
      });
      if (companyRes.status === false || companyRes.success === false) {
        setFieldErrors({
          company_name:
            companyRes.message || t('registerCompanyTaken', 'Company name already exists'),
        });
        setFormError(
          companyRes.message || t('registerCompanyTaken', 'Company name already exists')
        );
        return;
      }

      await signupService.signup({
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
        setFormError(err.message);
      } else {
        setFormError(
          err instanceof Error
            ? err.message
            : t('registerSignupFailed', 'Signup failed. Please try again.')
        );
      }
    } finally {
      setBusy(false);
    }
  }, [draft, certificateFile, t]);

  useEffect(() => {
    if (otpModal !== 'phone' || draft.phoneVerified || phoneOtp.length !== 6 || busy) return;
    void verifyPhone(phoneOtp);
  }, [phoneOtp, otpModal, draft.phoneVerified, busy, verifyPhone]);

  useEffect(() => {
    if (otpModal !== 'email' || draft.emailVerified || emailOtp.length !== 6 || busy) return;
    verifyEmail(emailOtp);
  }, [emailOtp, otpModal, draft.emailVerified, busy, verifyEmail]);

  return {
    draft,
    updateDraft,
    setPhone,
    setCountryCode,
    setEmail,
    fieldErrors,
    formError,
    busy,
    submitted,
    referenceLoading,
    countryCodes,
    countriesDomicile,
    otpModal,
    closeOtpModal,
    phoneOtp,
    setPhoneOtp,
    emailOtp,
    setEmailOtp,
    resendSeconds,
    openPhoneOtp,
    openEmailOtp,
    resendPhoneCode,
    resendEmailCode,
    verifyPhone,
    verifyEmail,
    certificateFile,
    setCertificate,
    softVerifyVat,
    vatHint,
    vatChecking,
    submitRegister,
  };
}
