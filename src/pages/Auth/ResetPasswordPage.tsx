import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import { authService } from '../../api/auth';
import fullLogo from '../../assets/logo/fullLogo.svg';
import './authForm.css';

const PASSWORD_PATTERN = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/;

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

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const particlesRef = useLoginParticles('shipper-reset-particles');
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();

  const emailParam = searchParams.get('email') || '';
  const userType = searchParams.get('user_type') || 'shippers';

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    email?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenInvalid(true);
      setErrorMessage(
        t('resetPasswordInvalidToken', 'This password reset token is invalid or has expired.')
      );
      return;
    }

    if (emailParam) {
      setVerifying(true);
      authService
        .verifyResetToken(token, emailParam)
        .then((res) => {
          if (!res.valid) {
            setTokenInvalid(true);
            setErrorMessage(
              res.message ||
                t('resetPasswordInvalidToken', 'This password reset token is invalid or has expired.')
            );
          }
        })
        .catch((err: unknown) => {
          setTokenInvalid(true);
          setErrorMessage(
            err instanceof Error
              ? err.message
              : t('resetPasswordInvalidToken', 'This password reset token is invalid or has expired.')
          );
        })
        .finally(() => setVerifying(false));
    }
  }, [token, emailParam, t]);

  const validatePassword = (val: string): string | undefined => {
    if (!val) {
      return t('loginPasswordRequired', 'Please enter password');
    }
    if (val.length < 8 || val.length > 15 || !PASSWORD_PATTERN.test(val)) {
      return t(
        'resetPasswordComplexity',
        'Your password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      );
    }
    return undefined;
  };

  const validateConfirmPassword = (confirmVal: string, pwVal: string): string | undefined => {
    if (!confirmVal) {
      return t('loginPasswordRequired', 'Please enter password');
    }
    if (confirmVal !== pwVal) {
      return t(
        'resetPasswordMismatch',
        'New password does not match with confirm password'
      );
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    const errors: { password?: string; confirmPassword?: string; email?: string } = {};
    if (!email) {
      errors.email = t('loginEmailRequired', 'Please enter email address');
    }
    if (pwErr) errors.password = pwErr;
    if (confirmErr) errors.confirmPassword = confirmErr;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !token) return;

    setSubmitting(true);
    try {
      await authService.resetPassword({
        token,
        email: email.trim(),
        password,
        password_confirmation: confirmPassword,
      });

      navigate(`/password-change-success?user_type=${encodeURIComponent(userType)}`, {
        replace: true,
      });
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : t('commonError', 'Something went wrong, please try again.');
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div ref={particlesRef} className="auth-particles" aria-hidden="true" />

      <div className="auth-card-cont">
        <div className="auth-card">
          <div className="auth-card-body">
            <div className="auth-header">
              <Link to="/login" className="auth-logo">
                <img
                  src={fullLogo}
                  alt={t('appName', 'MYVAGON')}
                  height={35}
                />
              </Link>
              <p className="auth-subtitle">
                {t(
                  'resetPasswordSubtitle',
                  'Enter password and confirm password to set new password'
                )}
              </p>
            </div>

            {errorMessage && (
              <div className="auth-alert auth-alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            {tokenInvalid ? (
              <div className="text-center" style={{ marginTop: '1.5rem' }}>
                <Link
                  to="/forgot-password"
                  className="submit-btn"
                  style={{ display: 'inline-block', textDecoration: 'none', maxWidth: '280px', margin: '0 auto' }}
                >
                  {t('forgotPasswordTitle', 'Forgot Password')}
                </Link>
                <div style={{ marginTop: '1.25rem' }}>
                  <Link to="/login" className="bk-login">
                    <b>{t('forgotPasswordBackToLogin', 'Back to login')}</b>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                {!emailParam && (
                  <div className={`auth-field${fieldErrors.email ? ' has-error' : ''}`}>
                    <label className="auth-label" htmlFor="emailaddress">
                      {t('forgotPasswordEmail', 'Email Address')}
                    </label>
                    <input
                      id="emailaddress"
                      name="email"
                      type="email"
                      className="auth-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('forgotPasswordEnterEmail', 'Enter your email address')}
                      required
                      disabled={submitting || verifying}
                    />
                    {fieldErrors.email && (
                      <p className="auth-field-error" role="alert">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                )}

                <div className={`auth-field${fieldErrors.password ? ' has-error' : ''}`}>
                  <label className="auth-label" htmlFor="new_password">
                    {t('resetPasswordNew', 'Password')}
                  </label>
                  <input
                    id="new_password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: validatePassword(e.target.value),
                      }));
                    }}
                    placeholder={t('resetPasswordNew', 'Password')}
                    required
                    disabled={submitting || verifying}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('loginHidePassword', 'Hide password') : t('loginShowPassword', 'Show password')}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                  {fieldErrors.password && (
                    <p className="auth-field-error" role="alert">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className={`auth-field${fieldErrors.confirmPassword ? ' has-error' : ''}`}>
                  <label className="auth-label" htmlFor="new_confirm">
                    {t('resetPasswordConfirm', 'Confirm Password')}
                  </label>
                  <input
                    id="new_confirm"
                    name="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: validateConfirmPassword(e.target.value, password),
                      }));
                    }}
                    placeholder={t('resetPasswordConfirm', 'Confirm Password')}
                    required
                    disabled={submitting || verifying}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? t('loginHidePassword', 'Hide password') : t('loginShowPassword', 'Show password')}
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                  {fieldErrors.confirmPassword && (
                    <p className="auth-field-error" role="alert">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="auth-links-row">
                  <Link to="/login" className="bk-login">
                    <b>{t('forgotPasswordBackToLogin', 'Back to login')}</b>
                  </Link>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={submitting || verifying}
                  >
                    {submitting
                      ? t('registerWorking', 'Please wait…')
                      : t('resetPasswordSubmit', 'Submit')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
