import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type CompanyStepProps = {
  companyName: string;
  onCompanyName: (v: string) => void;
  error?: string;
  disabled?: boolean;
};

export const CompanyStep: React.FC<CompanyStepProps> = ({
  companyName,
  onCompanyName,
  error,
  disabled,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-company">{t('registerCompanyName', 'Company name')}</label>
        <input
          id="register-company"
          className="shipper-login-control"
          value={companyName}
          disabled={disabled}
          autoComplete="organization"
          onChange={(e) => onCompanyName(e.target.value)}
          placeholder={t('registerCompanyPlaceholder', 'Company name')}
          maxLength={50}
        />
        {error && (
          <p className="shipper-login-field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
