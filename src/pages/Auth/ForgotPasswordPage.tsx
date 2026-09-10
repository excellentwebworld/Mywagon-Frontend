import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from '../Login/useLoginParticles';
import { authService } from '../../api/auth';
import fullLogo from '../../assets/logo/fullLogo.svg';
import './authForm.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const particlesRef = useLoginParticles('shipper-forgot-particles');

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      return t('loginEmailRequired', 'Please enter email address');
    }
    if (trimmed.length < 2) {
      return t('loginEmailMinLength', 'Email must contain at least 2 characters');
    }
    if (trimmed.length > 50) {
      return t('loginEmailMaxLength', 'Email cannot exceed 50 characters');
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      return t('loginEmailInvalid', 'Please enter valid email address.');
    }
    return null;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (touched) {
      setEmailError(validateEmail(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setSubmitting(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setSuccessMessage(
        res.message ||
          t('forgotPasswordSuccess', 'Reset password link sent on your email')
      );
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
                  'forgotPasswordSubtitle',
                  'Enter your email address to get reset password link'
                )}
              </p>
            </div>

            {errorMessage && (
              <div className="auth-alert auth-alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="auth-alert auth-alert-success" role="status">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className={`auth-field${emailError ? ' has-error' : ''}`}>
                <label className="auth-label" htmlFor="emailaddress">
                  {t('forgotPasswordEmail', 'Email Address')}
                </label>
                <input
                  id="emailaddress"
                  name="email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => {
                    if (touched) {
                      setEmailError(validateEmail(email));
                    }
                  }}
                  placeholder={t(
                    'forgotPasswordEnterEmail',
                    'Enter your email address'
                  )}
                  autoComplete="email"
                  maxLength={50}
                  aria-invalid={Boolean(emailError)}
                  disabled={submitting}
                />
                {emailError && (
                  <p className="auth-field-error" role="alert">
                    {emailError}
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
                  disabled={submitting}
                >
                  {submitting
                    ? t('registerWorking', 'Please wait…')
                    : t('forgotPasswordSubmit', 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
