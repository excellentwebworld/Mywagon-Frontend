import React, { useState } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';

type PasswordStepProps = {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  errors: { password?: string; password_confirmation?: string };
  disabled?: boolean;
};

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

export const PasswordStep: React.FC<PasswordStepProps> = ({
  password,
  confirm,
  onPassword,
  onConfirm,
  errors,
  disabled,
}) => {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="shipper-register-step">
      <div className="shipper-login-field">
        <label htmlFor="register-password">{t('registerPassword', 'Password')}</label>
        <div className="shipper-login-pw-wrap">
          <input
            id="register-password"
            className="shipper-login-control"
            type={showPw ? 'text' : 'password'}
            value={password}
            disabled={disabled}
            autoComplete="new-password"
            onChange={(e) => onPassword(e.target.value)}
            placeholder={t('registerPasswordPlaceholder', 'Create a password')}
          />
          <button
            type="button"
            className="shipper-login-pw-toggle"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? t('loginHidePassword') : t('loginShowPassword')}
          >
            <EyeIcon open={showPw} />
          </button>
        </div>
        <p className="shipper-register-field-hint">
          {t('registerPasswordHint', 'Min 8 characters · 1 uppercase · 1 number · 1 special')}
        </p>
        {errors.password && (
          <p className="shipper-login-field-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>
      <div className="shipper-login-field">
        <label htmlFor="register-password-confirm">{t('registerPasswordConfirm', 'Confirm password')}</label>
        <div className="shipper-login-pw-wrap">
          <input
            id="register-password-confirm"
            className="shipper-login-control"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            disabled={disabled}
            autoComplete="new-password"
            onChange={(e) => onConfirm(e.target.value)}
            placeholder={t('registerPasswordConfirmPlaceholder', 'Confirm password')}
          />
          <button
            type="button"
            className="shipper-login-pw-toggle"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? t('loginHidePassword') : t('loginShowPassword')}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {errors.password_confirmation && (
          <p className="shipper-login-field-error" role="alert">
            {errors.password_confirmation}
          </p>
        )}
      </div>
    </div>
  );
};
