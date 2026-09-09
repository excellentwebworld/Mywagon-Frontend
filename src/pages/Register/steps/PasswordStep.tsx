import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

type PasswordStepProps = {
  password: string;
  confirm: string;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  errors: { password?: string; password_confirmation?: string };
  disabled?: boolean;
};

const SPECIALS = '!@#$%^&*-?#';

function generateStrongPassword(length = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits + SPECIALS;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const required = [pick(upper), pick(lower), pick(digits), pick(SPECIALS)];
  const rest = Array.from({ length: Math.max(length - required.length, 0) }, () => pick(all));
  const chars = [...required, ...rest];

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

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

  const handleGenerate = () => {
    const next = generateStrongPassword(12);
    onPassword(next);
    onConfirm(next);
    setShowPw(true);
    setShowConfirm(true);
  };

  return (
    <>
      <div className="reg-field reg-password-wrap" data-reg-field="password">
        <input
          id="register-password"
          className="reg-input"
          type={showPw ? 'text' : 'password'}
          value={password}
          disabled={disabled}
          autoComplete="new-password"
          onChange={(e) => onPassword(e.target.value)}
          placeholder={`${t('registerEnterPassword', 'Enter your password')}*`}
          aria-label={t('registerEnterPassword', 'Enter your password')}
        />
        <button
          type="button"
          className="reg-password-toggle"
          onClick={() => setShowPw((v) => !v)}
          aria-label={showPw ? t('loginHidePassword') : t('loginShowPassword')}
        >
          {showPw ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <div className="reg-password-meta">
          <small className="reg-hint">
            {t(
              'registerPasswordHint',
              'Your password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
            )}
          </small>
          <button
            type="button"
            className="reg-generate-password"
            disabled={disabled}
            onClick={handleGenerate}
          >
            {t('registerGeneratePassword', 'Generate password')}
          </button>
        </div>
        {errors.password && (
          <p className="reg-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>
      <div className="reg-field reg-password-wrap" data-reg-field="password_confirmation">
        <input
          id="register-password-confirm"
          className="reg-input"
          type={showConfirm ? 'text' : 'password'}
          value={confirm}
          disabled={disabled}
          autoComplete="new-password"
          onChange={(e) => onConfirm(e.target.value)}
          placeholder={`${t('registerPasswordConfirm', 'Confirm password')}*`}
          aria-label={t('registerPasswordConfirm', 'Confirm password')}
        />
        <button
          type="button"
          className="reg-password-toggle"
          onClick={() => setShowConfirm((v) => !v)}
          aria-label={showConfirm ? t('loginHidePassword') : t('loginShowPassword')}
        >
          {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        {errors.password_confirmation && (
          <p className="reg-error" role="alert">
            {errors.password_confirmation}
          </p>
        )}
      </div>
    </>
  );
};
