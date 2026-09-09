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
    <div className="reg-field" data-reg-field="company_name">
      <input
        id="register-company"
        className="reg-input"
        value={companyName}
        disabled={disabled}
        autoComplete="organization"
        onChange={(e) => onCompanyName(e.target.value)}
        placeholder={`${t('registerCompanyName', 'Company name')}*`}
        maxLength={50}
        aria-label={t('registerCompanyName', 'Company name')}
      />
      {error && (
        <p className="reg-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
