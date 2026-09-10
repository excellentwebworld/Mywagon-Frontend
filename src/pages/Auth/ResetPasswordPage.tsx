import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import { authService } from '../../api/auth';
import fullLogo from '../../assets/logo/fullLogo.svg';
import './authForm.css';

const PASSWORD_PATTERN = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/;

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

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setErrorMessage(null);
    const pwErr = validatePassword(val);
    const confirmErr = confirmPassword
      ? validateConfirmPassword(confirmPassword, val)
      : fieldErrors.confirmPassword;

    setFieldErrors((prev) => ({
      ...prev,
      password: pwErr,
      ...(confirmPassword ? { confirmPassword: confirmErr } : {}),
    }));
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    setErrorMessage(null);
    const confirmErr = validateConfirmPassword(val, password);
    setFieldErrors((prev) => ({
      ...prev,
      confirmPassword: confirmErr,
    }));
  };

  const isPasswordValid = Boolean(password && !validatePassword(password));
  const isConfirmValid = Boolean(confirmPassword && password === confirmPassword);
  const isEmailValid = emailParam ? true : Boolean(email.trim());
  const isMismatch = Boolean(password && confirmPassword && password !== confirmPassword);

  const isFormInvalid =
    !isPasswordValid ||
    !isConfirmValid ||
    !isEmailValid ||
    isMismatch ||
    Boolean(fieldErrors.password) ||
    Boolean(fieldErrors.confirmPassword) ||
    Boolean(fieldErrors.email);

  const isSubmitDisabled = submitting || verifying || tokenInvalid || isFormInvalid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pwErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(confirmPassword, password);

    const errors: { password?: string; confirmPassword?: string; email?: string } = {};
    if (!emailParam && !email.trim()) {
      errors.email = t('loginEmailRequired', 'Please enter email address');
    }
    if (pwErr) errors.password = pwErr;
    if (confirmErr) errors.confirmPassword = confirmErr;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !token || password !== confirmPassword) {
      return;
    }

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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (!e.target.value.trim()) {
                          setFieldErrors((prev) => ({ ...prev, email: t('loginEmailRequired', 'Please enter email address') }));
                        } else {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
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
                    onChange={(e) => handlePasswordChange(e.target.value)}
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    onChange={(e) => handleConfirmPasswordChange(e.target.value)}
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
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                    disabled={isSubmitDisabled}
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
