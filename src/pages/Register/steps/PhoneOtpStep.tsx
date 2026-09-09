import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { OtpBoxes } from '../components/OtpBoxes';

type PhoneOtpStepProps = {
  countryCode: string;
  phone: string;
  otp: string;
  onOtp: (v: string) => void;
  verified: boolean;
  onResend: () => void;
  resendSeconds: number;
  busy?: boolean;
  error?: string;
};

export const PhoneOtpStep: React.FC<PhoneOtpStepProps> = ({
  countryCode,
  phone,
  otp,
  onOtp,
  verified,
  onResend,
  resendSeconds,
  busy,
  error,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step shipper-register-step--center">
      <p className="shipper-register-hint">{t('registerCodeSent', 'Code sent to')}</p>
      <p className="shipper-register-target">
        {countryCode} {phone}
      </p>
      <OtpBoxes value={otp} onChange={onOtp} verified={verified} disabled={busy} error={error} />
      {verified ? (
        <p className="shipper-register-verified">{t('registerVerified', 'Verified!')}</p>
      ) : (
        <p className="shipper-register-resend">
          {t('registerCodeHint', "Didn't get it?")}{' '}
          {resendSeconds > 0 ? (
            <span>
              {t('registerResendIn', 'Resend in {{seconds}}s', { seconds: resendSeconds })}
            </span>
          ) : (
            <button type="button" className="shipper-register-link-btn" disabled={busy} onClick={onResend}>
              {t('registerResend', 'Resend')}
            </button>
          )}
        </p>
      )}
    </div>
  );
};
