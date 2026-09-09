import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type EmailStepProps = {
  email: string;
  onEmail: (v: string) => void;
  onSendCode: () => void;
  error?: string;
  busy?: boolean;
};

export const EmailStep: React.FC<EmailStepProps> = ({ email, onEmail, onSendCode, error, busy }) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-email">{t('registerEmail', 'Work email')}</label>
        <input
          id="register-email"
          className="shipper-login-control"
          type="email"
          value={email}
          disabled={busy}
          autoComplete="email"
          onChange={(e) => onEmail(e.target.value)}
          placeholder={t('registerEmailPlaceholder', 'name@company.com')}
        />
        {error && (
          <p className="shipper-login-field-error" role="alert">
            {error}
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
