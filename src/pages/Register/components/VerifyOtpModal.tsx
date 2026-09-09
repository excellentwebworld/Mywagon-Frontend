import React, { useEffect } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { OtpBoxes } from './OtpBoxes';

type VerifyOtpModalProps = {
  mode: 'phone' | 'email';
  target: string;
  otp: string;
  onOtp: (v: string) => void;
  verified: boolean;
  onResend: () => void;
  onClose: () => void;
  onVerify: () => void;
  resendSeconds: number;
  busy?: boolean;
  error?: string;
  /** Staging/dev parity with Blade: show OTP for QA */
  debugOtp?: string | null;
  /** Blade green flash after successful resend */
  resentFlash?: boolean;
};

export const VerifyOtpModal: React.FC<VerifyOtpModalProps> = ({
  mode,
  target,
  otp,
  onOtp,
  verified,
  onResend,
  onClose,
  onVerify,
  resendSeconds,
  busy,
  error,
  debugOtp,
  resentFlash,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const minutes = Math.floor(Math.max(resendSeconds, 0) / 60);
  const seconds = Math.max(resendSeconds, 0) % 60;
  const timerLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      className="reg-otp-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-otp-title"
    >
      <div className="reg-otp-modal">
        <button
          type="button"
          className="reg-otp-close"
          onClick={onClose}
          aria-label={t('registerClose', 'Close')}
        >
          ×
        </button>
        <h2 id="register-otp-title" className="reg-otp-title">
          {t('registerEnterOtpSentTo', 'Enter OTP sent to')}
          <div className="reg-otp-destination">{target}</div>
        </h2>
        {debugOtp ? (
          <p className="reg-otp-debug" aria-live="polite">
            OTP: {debugOtp}
          </p>
        ) : null}
        {resentFlash ? (
          <div className="reg-otp-resent" role="status">
            {t('registerOtpResent', 'OTP resent successfully')}
          </div>
        ) : null}
        <OtpBoxes value={otp} onChange={onOtp} verified={verified} disabled={busy} />
        {error ? <p className="reg-otp-error" role="alert">{error}</p> : null}
        {verified ? (
          <p className="reg-hint">{t('registerVerified', 'Verified!')}</p>
        ) : (
          <>
            <div className="reg-otp-resend-row">
              <span className="reg-otp-didnt-receive">
                {t('registerOtpDidntReceive', "Didn't receive the OTP?")}{' '}
              </span>
              {resendSeconds > 0 ? (
                <>
                  <span className="reg-otp-resend-after">
                    {t('registerOtpResendAfter', 'Resend OTP after')}{' '}
                  </span>
                  <span className="reg-otp-timer">{timerLabel}</span>
                </>
              ) : (
                <button
                  type="button"
                  className="reg-otp-resend-link"
                  disabled={busy}
                  onClick={onResend}
                >
                  {t('registerResendOtp', 'Resend OTP')}
                </button>
              )}
            </div>
            <button
              type="button"
              className="reg-otp-verify-btn"
              disabled={busy || otp.length !== 6}
              onClick={onVerify}
            >
              {busy ? t('registerWorking', 'Please wait…') : t('registerVerify', 'Verify')}
            </button>
          </>
        )}
        <p className="reg-hint" style={{ marginTop: '0.75rem' }}>
          {mode === 'phone'
            ? t('registerVerifyPhoneHint', 'Enter the 6-digit code sent to your phone')
            : t('registerVerifyEmailHint', 'Enter the 6-digit code sent to your email')}
        </p>
      </div>
    </div>
  );
};
