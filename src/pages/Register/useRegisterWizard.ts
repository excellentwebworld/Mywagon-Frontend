import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signupService } from '../../api/auth';
import type { SignupReferenceCountryCode } from '../../api/auth';
import {
  PHASE1_STEPS,
  loadSignupDraft,
  patchSignupDraft,
  type Phase1StepKey,
  type SignupDraft,
} from './signupDraft';
import {
  digitsOnlyPhone,
  validateEmailStep,
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
  const [stepIndex, setStepIndex] = useState(() => {
    const loaded = loadSignupDraft();
    return Math.min(Math.max(loaded.stepIndex, 0), PHASE1_STEPS.length);
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [pendingEmailOtp, setPendingEmailOtp] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [countryCodes, setCountryCodes] = useState<SignupReferenceCountryCode[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const verifyingPhoneRef = useRef(false);
  const verifyingEmailRef = useRef(false);

  const stepKey: Phase1StepKey =
    stepIndex >= PHASE1_STEPS.length ? 'hold' : PHASE1_STEPS[stepIndex];

  const progressCurrent = stepKey === 'hold' ? PHASE1_STEPS.length : stepIndex + 1;
  const progressTotal = PHASE1_STEPS.length;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReferenceLoading(true);
      try {
        const data = await signupService.getReference();
        if (cancelled) return;
        const codes = data.country_codes ?? [];
        setCountryCodes(codes);
        setDraft((prev) => {
          if (prev.country_code) return prev;
          const preferred =
            codes.find((c) => c.code === '+30')?.code || codes[0]?.code || '+30';
          return patchSignupDraft(prev, { country_code: preferred });
        });
      } catch (err) {
        if (!cancelled) {
          setFormError(err instanceof Error ? err.message : t('registerReferenceFailed', 'Could not load signup data'));
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
        if (key === 'first_name') delete next.first_name;
        if (key === 'last_name') delete next.last_name;
        if (key === 'phone' || key === 'country_code') {
          delete next.phone;
          delete next.country_code;
        }
        if (key === 'email') delete next.email;
        if (key === 'password') delete next.password;
        if (key === 'password_confirmation') delete next.password_confirmation;
      }
      return next;
    });
    setFormError(null);
  }, []);

  const goToStep = useCallback((index: number) => {
    const clamped = Math.min(Math.max(index, 0), PHASE1_STEPS.length);
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
    verifyingEmailRef.current = false;
  }, []);

  const setPhone = useCallback(
    (phone: string) => {
      const digits = digitsOnlyPhone(phone).slice(0, 10);
      updateDraft({
        phone: digits,
        phoneVerified: false,
      });
      clearPhoneOtpState();
    },
    [updateDraft, clearPhoneOtpState]
  );

  const setCountryCode = useCallback(
    (country_code: string) => {
      updateDraft({
        country_code,
        phoneVerified: false,
      });
      clearPhoneOtpState();
    },
    [updateDraft, clearPhoneOtpState]
  );

  const setEmail = useCallback(
    (email: string) => {
      updateDraft({
        email,
        emailVerified: false,
      });
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
        setFieldErrors({ phone: dup.message || t('registerPhoneTaken', 'This phone number has already been taken') });
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
      goToStep(PHASE1_STEPS.indexOf('phOtp'));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('registerPhoneOtpSendFailed', 'Could not send phone OTP'));
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
      setFormError(err instanceof Error ? err.message : t('registerPhoneOtpSendFailed', 'Could not send phone OTP'));
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
      const otpFromApi = res.otp != null ? String(res.otp) : null;
      setPendingEmailOtp(otpFromApi);
      setEmailOtp('');
      updateDraft({ emailVerified: false, email: draft.email.trim() });
      startResendCooldown();
      goToStep(PHASE1_STEPS.indexOf('emOtp'));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('registerEmailOtpSendFailed', 'Could not send email OTP'));
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
      setFormError(err instanceof Error ? err.message : t('registerEmailOtpSendFailed', 'Could not send email OTP'));
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
    goToStep(PHASE1_STEPS.indexOf('ph'));
  }, [draft.first_name, draft.last_name, t, updateDraft, goToStep]);

  const continueFromPhoneOtp = useCallback(async () => {
    if (!draft.phoneVerified) {
      const ok = await verifyPhoneCode(phoneOtp);
      if (!ok) return;
    }
    goToStep(PHASE1_STEPS.indexOf('em'));
  }, [draft.phoneVerified, phoneOtp, verifyPhoneCode, goToStep]);

  const continueFromEmailOtp = useCallback(() => {
    if (!draft.emailVerified) {
      const ok = verifyEmailCode(emailOtp);
      if (!ok) return;
    }
    goToStep(PHASE1_STEPS.indexOf('pw'));
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
    goToStep(PHASE1_STEPS.length); // hold
  }, [draft.password, draft.password_confirmation, t, updateDraft, goToStep]);

  const goBack = useCallback(() => {
    if (stepKey === 'hold') {
      goToStep(PHASE1_STEPS.indexOf('pw'));
      return;
    }
    if (stepIndex <= 0) return;

    const prevKey = PHASE1_STEPS[stepIndex - 1];
    if (stepKey === 'phOtp') {
      clearPhoneOtpState();
      updateDraft({ phoneVerified: false });
    }
    if (stepKey === 'emOtp') {
      clearEmailOtpState();
      updateDraft({ emailVerified: false });
    }
    if (prevKey === 'ph' && stepKey === 'phOtp') {
      /* going to phone */
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
      default:
        break;
    }
  }, [stepKey, continueFromName, continueFromPhoneOtp, continueFromEmailOtp, continueFromPassword]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (stepKey !== 'phOtp' || draft.phoneVerified || phoneOtp.length !== 6 || busy) return;
    void verifyPhoneCode(phoneOtp);
  }, [phoneOtp, stepKey, draft.phoneVerified, busy, verifyPhoneCode]);

  useEffect(() => {
    if (stepKey !== 'emOtp' || draft.emailVerified || emailOtp.length !== 6 || busy) return;
    verifyEmailCode(emailOtp);
  }, [emailOtp, stepKey, draft.emailVerified, busy, verifyEmailCode]);

  const stepTitleKey = useMemo(() => {
    const map: Record<Phase1StepKey, string> = {
      nm: 'registerStepName',
      ph: 'registerStepPhone',
      phOtp: 'registerStepPhoneOtp',
      em: 'registerStepEmail',
      emOtp: 'registerStepEmailOtp',
      pw: 'registerStepPassword',
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
