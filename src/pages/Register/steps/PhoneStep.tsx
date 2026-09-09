import React from 'react';
import type { SignupReferenceCountryCode } from '../../../api/auth';
import { useTranslation } from '../../../hooks/useTranslation';
import { CountryCodeSelect } from '../components/CountryCodeSelect';

type PhoneStepProps = {
  countryCode: string;
  phone: string;
  countryCodes: SignupReferenceCountryCode[];
  onCountryCode: (v: string) => void;
  onPhone: (v: string) => void;
  onSendCode: () => void;
  errors: { country_code?: string; phone?: string };
  busy?: boolean;
};

export const PhoneStep: React.FC<PhoneStepProps> = ({
  countryCode,
  phone,
  countryCodes,
  onCountryCode,
  onPhone,
  onSendCode,
  errors,
  busy,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-phone">{t('registerPhone', 'Mobile phone')}</label>
        <div className="shipper-register-phone-row">
          <CountryCodeSelect
            value={countryCode}
            options={countryCodes}
            onChange={onCountryCode}
            disabled={busy}
            error={errors.country_code}
          />
          <input
            id="register-phone"
            className="shipper-login-control shipper-register-phone-input"
            type="tel"
            inputMode="numeric"
            value={phone}
            disabled={busy}
            autoComplete="tel-national"
            onChange={(e) => onPhone(e.target.value)}
            placeholder={t('registerPhonePlaceholder', '6941234567')}
            maxLength={10}
          />
        </div>
        {errors.phone && (
          <p className="shipper-login-field-error" role="alert">
            {errors.phone}
          </p>
        )}
      </div>
      <div className="shipper-login-submit-wrap">
        <button
          type="button"
          className="shipper-login-submit-btn"
          disabled={busy}
          onClick={onSendCode}
        >
          {busy ? t('registerSending', 'Sending…') : t('registerSendCode', 'Send code')}
        </button>
      </div>
    </div>
  );
};
