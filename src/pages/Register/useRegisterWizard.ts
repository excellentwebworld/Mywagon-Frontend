import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signupService } from '../../api/auth';
import type { SignupReferenceCountryCode, SignupReferenceDomicile } from '../../api/auth';
import {
  REGISTER_STEPS,
  loadSignupDraft,
  patchSignupDraft,
  type RegisterStepKey,
  type SignupDraft,
} from './signupDraft';
import {
  digitsOnlyPhone,
  validateAddressStep,
  validateCompanyStep,
  validateEmailStep,
  validateMarketingTermsStep,
  validateNameStep,
  validateOtp,
  validatePasswordStep,
  validatePhoneStep,
  type RegisterFieldErrors,
} from './registerValidation';

type Translate = (key: string, fallbackOrOptions?: string | Record<string, unknown>) => string;

const RESEND_SECONDS = 60;

export function useRegisterWizard(t: Translate) {
  const [draft, setDraft] = useState<SignupDraft>(() => loadSignupDraft());
  const [stepIndex, setStepIndex] = useState(() => loadSignupDraft().stepIndex);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [countriesDomicile, setCountriesDomicile] = useState<SignupReferenceDomicile[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const verifyingPhoneRef = useRef(false);

  const stepKey: RegisterStepKey =
    stepIndex >= REGISTER_STEPS.length ? 'hold' : REGISTER_STEPS[stepIndex];

  const progressCurrent = stepKey === 'hold' ? REGISTER_STEPS.length : stepIndex + 1;
  const progressTotal = REGISTER_STEPS.length;

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

  const goToStep = useCallback((index: number) => {
    const clamped = Math.min(Math.max(index, 0), REGISTER_STEPS.length);
    setStepIndex(clamped);
    setDraft((prev) => patchSignupDraft(prev, { stepIndex: clamped }));
    setFieldErrors({});
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

  const setPhone = useCallback(
    (phone: string) => {
      const digits = digitsOnlyPhone(phone).slice(0, 10);
      updateDraft({ phone: digits, phoneVerified: false });
      clearPhoneOtpState();
    },
    [updateDraft, clearPhoneOtpState]
  );

  const setCountryCode = useCallback(
    (country_code: string) => {
      updateDraft({ country_code, phoneVerified: false });
      clearPhoneOtpState();
    },
    [updateDraft, clearPhoneOtpState]
  );

  const setEmail = useCallback(
    (email: string) => {
      updateDraft({ email, emailVerified: false });
      clearEmailOtpState();
    },
    [updateDraft, clearEmailOtpState]
  );

  const startResendCooldown = useCallback(() => {
    setResendSeconds(RESEND_SECONDS);
  }, []);

  const sendPhoneCode = useCallback(async () => {
    const errors = validatePhoneStep(draft.country_code, draft.phone, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
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
        setFieldErrors({
          phone: dup.message || t('registerPhoneTaken', 'This phone number has already been taken'),
        });
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
      goToStep(REGISTER_STEPS.indexOf('phOtp'));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerPhoneOtpSendFailed', 'Could not send phone OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [draft.country_code, draft.phone, t, clearPhoneOtpState, updateDraft, startResendCooldown, goToStep]);

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

  const verifyPhoneCode = useCallback(
    async (otp: string) => {
      const otpError = validateOtp(otp, t);
      if (otpError) {
        setFieldErrors({ otp: otpError });
        return false;
      }
      if (verifyingPhoneRef.current || draft.phoneVerified) return draft.phoneVerified;
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
          return next;
        });
        return true;
      } catch (err) {
        setFieldErrors({
          otp: err instanceof Error ? err.message : t('registerOtpInvalid', 'Enter valid OTP'),
        });
        updateDraft({ phoneVerified: false });
        return false;
      } finally {
        verifyingPhoneRef.current = false;
        setBusy(false);
      }
    },
    [t, draft.phoneVerified, draft.country_code, draft.phone, updateDraft]
  );

  const sendEmailCode = useCallback(async () => {
    const errors = validateEmailStep(draft.email, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
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
        setFieldErrors({ email: dup.message || t('registerEmailTaken', 'Already taken') });
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
      goToStep(REGISTER_STEPS.indexOf('emOtp'));
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : t('registerEmailOtpSendFailed', 'Could not send email OTP')
      );
    } finally {
      setBusy(false);
    }
  }, [draft.email, t, updateDraft, startResendCooldown, goToStep]);

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

  const verifyEmailCode = useCallback(
    (otp: string) => {
      const otpError = validateOtp(otp, t);
      if (otpError) {
        setFieldErrors({ otp: otpError });
        return false;
      }
      if (draft.emailVerified) return true;
      if (!pendingEmailOtp || otp !== pendingEmailOtp) {
        setFieldErrors({ otp: t('registerOtpInvalid', 'Enter valid OTP') });
        updateDraft({ emailVerified: false });
        return false;
      }
      updateDraft({ emailVerified: true });
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.otp;
        return next;
      });
      return true;
    },
    [t, draft.emailVerified, pendingEmailOtp, updateDraft]
  );

  const continueFromName = useCallback(() => {
    const errors = validateNameStep(draft.first_name, draft.last_name, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    updateDraft({
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
    });
    goToStep(REGISTER_STEPS.indexOf('ph'));
  }, [draft.first_name, draft.last_name, t, updateDraft, goToStep]);

  const continueFromPhoneOtp = useCallback(async () => {
    if (!draft.phoneVerified) {
      const ok = await verifyPhoneCode(phoneOtp);
      if (!ok) return;
    }
    goToStep(REGISTER_STEPS.indexOf('em'));
  }, [draft.phoneVerified, phoneOtp, verifyPhoneCode, goToStep]);

  const continueFromEmailOtp = useCallback(() => {
    if (!draft.emailVerified) {
      const ok = verifyEmailCode(emailOtp);
      if (!ok) return;
    }
    goToStep(REGISTER_STEPS.indexOf('pw'));
  }, [draft.emailVerified, emailOtp, verifyEmailCode, goToStep]);

  const continueFromPassword = useCallback(() => {
    const errors = validatePasswordStep(draft.password, draft.password_confirmation, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    updateDraft({
      password: draft.password,
      password_confirmation: draft.password_confirmation,
    });
    goToStep(REGISTER_STEPS.indexOf('co'));
  }, [draft.password, draft.password_confirmation, t, updateDraft, goToStep]);

  const continueFromCompany = useCallback(async () => {
    const errors = validateCompanyStep(draft.company_name, t);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await signupService.checkCompany({
        table_name: 'shippers',
        field_name: 'company_name',
        new_value: draft.company_name.trim(),
      });
      if (res.status === false || res.success === false) {
        setFieldErrors({
          company_name: res.message || t('registerCompanyTaken', 'Company name already exists'),
        });
        return;
      }
      updateDraft({ company_name: draft.company_name.trim() });
      goToStep(REGISTER_STEPS.indexOf('ad'));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t('registerCompanyCheckFailed', 'Could not verify company name')
      );
    } finally {
      setBusy(false);
    }
  }, [draft.company_name, t, updateDraft, goToStep]);

  const continueFromAddress = useCallback(() => {
    const errors = validateAddressStep(
      {
        street_address: draft.street_address,
        postal_code: draft.postal_code,
        city: draft.city,
        address_country: draft.address_country,
      },
      t
    );
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    updateDraft({
      street_address: draft.street_address.trim(),
      address_line_2: draft.address_line_2.trim(),
      postal_code: draft.postal_code.trim(),
      city: draft.city.trim(),
      address_country: draft.address_country.trim(),
    });
    goToStep(REGISTER_STEPS.indexOf('mk'));
  }, [draft, t, updateDraft, goToStep]);

  const continueFromMarketing = useCallback(() => {
    const errors = validateMarketingTermsStep(
      {
        hear_about_us_shipper: draft.hear_about_us_shipper,
        hear_about_us_other_shipper: draft.hear_about_us_other_shipper,
        referral_code: draft.referral_code,
        terms: draft.terms,
      },
      t
    );
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    updateDraft({
      hear_about_us_shipper: draft.hear_about_us_shipper,
      hear_about_us_other_shipper:
        draft.hear_about_us_shipper === 'Other' ? draft.hear_about_us_other_shipper.trim() : '',
      referral_code: draft.referral_code.trim(),
      terms: true,
    });
    goToStep(REGISTER_STEPS.length); // hold
  }, [draft, t, updateDraft, goToStep]);

  const goBack = useCallback(() => {
    if (stepKey === 'hold') {
      goToStep(REGISTER_STEPS.indexOf('mk'));
      return;
    }
    if (stepIndex <= 0) return;

    if (stepKey === 'phOtp') {
      clearPhoneOtpState();
      updateDraft({ phoneVerified: false });
    }
    if (stepKey === 'emOtp') {
      clearEmailOtpState();
      updateDraft({ emailVerified: false });
    }
    goToStep(stepIndex - 1);
  }, [stepKey, stepIndex, goToStep, clearPhoneOtpState, clearEmailOtpState, updateDraft]);

  const showContinue = useMemo(() => {
    if (stepKey === 'ph' || stepKey === 'em' || stepKey === 'hold') return false;
    return true;
  }, [stepKey]);

  const canContinue = useMemo(() => {
    if (busy) return false;
    if (stepKey === 'phOtp') return phoneOtp.length === 6 || draft.phoneVerified;
    if (stepKey === 'emOtp') return emailOtp.length === 6 || draft.emailVerified;
    return true;
  }, [busy, stepKey, phoneOtp, emailOtp, draft.phoneVerified, draft.emailVerified]);

  const onContinue = useCallback(async () => {
    switch (stepKey) {
      case 'nm':
        continueFromName();
        break;
      case 'phOtp':
        await continueFromPhoneOtp();
        break;
      case 'emOtp':
        continueFromEmailOtp();
        break;
      case 'pw':
        continueFromPassword();
        break;
      case 'co':
        await continueFromCompany();
        break;
      case 'ad':
        continueFromAddress();
        break;
      case 'mk':
        continueFromMarketing();
        break;
      default:
        break;
    }
  }, [
    stepKey,
    continueFromName,
    continueFromPhoneOtp,
    continueFromEmailOtp,
    continueFromPassword,
    continueFromCompany,
    continueFromAddress,
    continueFromMarketing,
  ]);

  useEffect(() => {
    if (stepKey !== 'phOtp' || draft.phoneVerified || phoneOtp.length !== 6 || busy) return;
    void verifyPhoneCode(phoneOtp);
  }, [phoneOtp, stepKey, draft.phoneVerified, busy, verifyPhoneCode]);

  useEffect(() => {
    if (stepKey !== 'emOtp' || draft.emailVerified || emailOtp.length !== 6 || busy) return;
    verifyEmailCode(emailOtp);
  }, [emailOtp, stepKey, draft.emailVerified, busy, verifyEmailCode]);

  const stepTitleKey = useMemo(() => {
    const map: Record<RegisterStepKey, string> = {
      nm: 'registerStepName',
      ph: 'registerStepPhone',
      phOtp: 'registerStepPhoneOtp',
      em: 'registerStepEmail',
      emOtp: 'registerStepEmailOtp',
      pw: 'registerStepPassword',
      co: 'registerStepCompany',
      ad: 'registerStepAddress',
      mk: 'registerStepMarketing',
      hold: 'registerStepHold',
    };
    return map[stepKey];
  }, [stepKey]);

  return {
    draft,
    updateDraft,
    setPhone,
    setCountryCode,
    setEmail,
    stepKey,
    stepIndex,
    progressCurrent,
    progressTotal,
    fieldErrors,
    formError,
    busy,
    referenceLoading,
    countryCodes,
    countriesDomicile,
    phoneOtp,
    setPhoneOtp,
    emailOtp,
    setEmailOtp,
    resendSeconds,
    sendPhoneCode,
    resendPhoneCode,
    sendEmailCode,
    resendEmailCode,
    showContinue,
    canContinue,
    onContinue,
    goBack,
    stepTitleKey,
    canGoBack: stepIndex > 0 || stepKey === 'hold',
  };
}
