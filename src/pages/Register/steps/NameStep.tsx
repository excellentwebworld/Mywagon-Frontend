import React from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type NameStepProps = {
  firstName: string;
  lastName: string;
  onFirstName: (v: string) => void;
  onLastName: (v: string) => void;
  errors: { first_name?: string; last_name?: string };
  disabled?: boolean;
};

export const NameStep: React.FC<NameStepProps> = ({
  firstName,
  lastName,
  onFirstName,
  onLastName,
  errors,
  disabled,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-first-name">{t('registerFirstName', 'First name')}</label>
        <input
          id="register-first-name"
          className="shipper-login-control"
          value={firstName}
          disabled={disabled}
          autoComplete="given-name"
          onChange={(e) => onFirstName(e.target.value)}
          placeholder={t('registerFirstNamePlaceholder', 'First name')}
        />
        {errors.first_name && (
          <p className="shipper-login-field-error" role="alert">
            {errors.first_name}
          </p>
        )}
      </div>
      <div className="shipper-login-field">
        <label htmlFor="register-last-name">{t('registerLastName', 'Last name')}</label>
        <input
          id="register-last-name"
          className="shipper-login-control"
          value={lastName}
          disabled={disabled}
          autoComplete="family-name"
          onChange={(e) => onLastName(e.target.value)}
          placeholder={t('registerLastNamePlaceholder', 'Last name')}
        />
        {errors.last_name && (
          <p className="shipper-login-field-error" role="alert">
            {errors.last_name}
          </p>
        )}
      </div>
    </div>
  );
};
