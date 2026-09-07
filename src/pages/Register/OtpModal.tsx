import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  /** Email or phone shown under "Enter OTP sent to" */
  destination: string;
  /** Expected OTP for client-side compare (email always; phone on local/staging) */
  expectedOtp?: string | null;
  /** Show OTP value in staging/dev like Blade */
  debugOtp?: string | null;
  onClose: () => void;
  onVerified: () => void;
  /** Optional server verify (production phone). Return true if OK. */
  onServerVerify?: (otp: string) => Promise<void>;
  onResend: () => Promise<string | null | undefined>;
  labels: {
    titlePrefix: string;
    verify: string;
    resend: string;
    resendAfter: string;
    didntReceive: string;
    enterOtp: string;
    invalidOtp: string;
    resent: string;
  };
};

const isClientOtpEnv = () => {
  const mode = import.meta.env.MODE;
  return mode === 'development' || mode === 'staging' || import.meta.env.DEV;
};

export const OtpModal: React.FC<Props> = ({
  open,
  destination,
  expectedOtp,
  debugOtp,
  onClose,
  onVerified,
  onServerVerify,
  onResend,
  labels,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [resentFlash, setResentFlash] = useState(false);
  const [currentExpected, setCurrentExpected] = useState<string | null | undefined>(expectedOtp);
  const [currentDebug, setCurrentDebug] = useState<string | null | undefined>(debugOtp);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    setDigits(['', '', '', '', '', '']);
    setError(null);
    setBusy(false);
    setResendSeconds(30);
    setResentFlash(false);
    setCurrentExpected(expectedOtp);
    setCurrentDebug(debugOtp);
    window.setTimeout(() => inputsRef.current[0]?.focus(), 50);
  }, [open, expectedOtp, debugOtp]);

  useEffect(() => {
    if (!open || resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [open, resendSeconds]);

  if (!open) return null;

  const setDigitAt = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    setError(null);
    if (digits.some((d) => !d)) {
      setError(labels.enterOtp);
      return;
    }
    const entered = digits.join('');
    setBusy(true);
    try {
      const useClientCompare = Boolean(currentExpected) && (!onServerVerify || isClientOtpEnv());
      if (useClientCompare) {
        if (String(currentExpected) !== entered) {
          setError(labels.invalidOtp);
          setDigits(['', '', '', '', '', '']);
          inputsRef.current[0]?.focus();
          return;
        }
        onVerified();
        return;
      }
      if (onServerVerify) {
        await onServerVerify(entered);
        onVerified();
        return;
      }
      setError(labels.invalidOtp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.invalidOtp);
      setDigits(['', '', '', '', '', '']);
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const otp = await onResend();
      if (otp != null) {
        setCurrentExpected(String(otp));
        setCurrentDebug(String(otp));
      }
      setDigits(['', '', '', '', '', '']);
      setResendSeconds(30);
      setResentFlash(true);
      window.setTimeout(() => setResentFlash(false), 3000);
      inputsRef.current[0]?.focus();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.invalidOtp);
    } finally {
      setBusy(false);
    }
  };

  const mm = String(Math.floor(resendSeconds / 60)).padStart(2, '0');
  const ss = String(resendSeconds % 60).padStart(2, '0');

  return (
    <div className="reg-otp-backdrop" role="dialog" aria-modal="true">
      <div className="reg-otp-modal">
        <button type="button" className="reg-otp-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="reg-otp-title">
          {labels.titlePrefix}
          <div className="reg-otp-destination">{destination}</div>
          {currentDebug && isClientOtpEnv() ? (
            <div className="reg-otp-debug">OTP: {currentDebug}</div>
          ) : null}
        </div>

        {resentFlash ? <div className="reg-otp-resent">{labels.resent}</div> : null}

        <div className="reg-otp-digits" onPaste={onPaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              className="reg-otp-digit"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => setDigitAt(index, e.target.value)}
              onKeyDown={(e) => onKeyDown(index, e)}
              autoComplete="one-time-code"
            />
          ))}
        </div>
        {error ? <p className="reg-otp-error">{error}</p> : null}

        <p className="reg-otp-resend-row">
          {labels.didntReceive}{' '}
          {resendSeconds > 0 ? (
            <>
              <span>{labels.resendAfter}</span>{' '}
              <span className="reg-otp-timer">
                {mm}:{ss}
              </span>
            </>
          ) : (
            <button type="button" className="reg-otp-resend-link" onClick={() => void handleResend()} disabled={busy}>
              {labels.resend}
            </button>
          )}
        </p>

        <button type="button" className="reg-otp-verify-btn" onClick={() => void handleVerify()} disabled={busy}>
          {busy ? '…' : labels.verify}
        </button>
      </div>
    </div>
  );
};
