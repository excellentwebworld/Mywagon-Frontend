import React from 'react';
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
}) => {
  const { t } = useTranslation();
  const title =
    mode === 'phone'
      ? t('registerVerifyPhoneTitle', 'Verify phone')
      : t('registerVerifyEmailTitle', 'Verify email');

  return (
    <div className="shipper-register-otp-modal" role="dialog" aria-modal="true" aria-labelledby="register-otp-title">
      <button
        type="button"
        className="shipper-register-otp-modal-backdrop"
        aria-label={t('registerClose', 'Close')}
        onClick={onClose}
      />
      <div className="shipper-register-otp-modal-card">
        <div className="shipper-register-otp-modal-header">
          <h2 id="register-otp-title" className="shipper-register-otp-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="shipper-register-otp-modal-close"
            onClick={onClose}
            aria-label={t('registerClose', 'Close')}
          >
            ×
          </button>
        </div>
        <p className="shipper-register-hint">{t('registerCodeSent', 'Code sent to')}</p>
        <p className="shipper-register-target">{target}</p>
        <OtpBoxes value={otp} onChange={onOtp} verified={verified} disabled={busy} error={error} />
        {verified ? (
          <p className="shipper-register-verified">{t('registerVerified', 'Verified!')}</p>
        ) : (
          <>
            <p className="shipper-register-resend">
              {t('registerCodeHint', "Didn't get it?")}{' '}
              {resendSeconds > 0 ? (
                <span>
                  {t('registerResendIn', 'Resend in {{seconds}}s', { seconds: resendSeconds })}
                </span>
              ) : (
                <button
                  type="button"
                  className="shipper-register-link-btn"
                  disabled={busy}
                  onClick={onResend}
                >
                  {t('registerResend', 'Resend')}
                </button>
              )}
            </p>
            <div className="shipper-login-submit-wrap" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="shipper-login-submit-btn"
                disabled={busy || otp.length !== 6}
                onClick={onVerify}
              >
                {busy ? t('registerWorking', 'Please wait…') : t('registerVerify', 'Verify')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
