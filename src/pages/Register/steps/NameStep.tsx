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
    <>
      <div className="reg-field" data-reg-field="first_name">
        <input
          id="register-first-name"
          className="reg-input"
          value={firstName}
          disabled={disabled}
          autoComplete="given-name"
          onChange={(e) => onFirstName(e.target.value)}
          placeholder={`${t('registerFirstName', 'First name')}*`}
          aria-label={t('registerFirstName', 'First name')}
        />
        {errors.first_name && (
          <p className="reg-error" role="alert">
            {errors.first_name}
          </p>
        )}
      </div>
      <div className="reg-field" data-reg-field="last_name">
        <input
          id="register-last-name"
          className="reg-input"
          value={lastName}
          disabled={disabled}
          autoComplete="family-name"
          onChange={(e) => onLastName(e.target.value)}
          placeholder={`${t('registerLastName', 'Last name')}*`}
          aria-label={t('registerLastName', 'Last name')}
        />
        {errors.last_name && (
          <p className="reg-error" role="alert">
            {errors.last_name}
          </p>
        )}
      </div>
    </>
  );
};
