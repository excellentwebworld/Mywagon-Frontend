import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useLoginParticles } from './useLoginParticles';
import type { TwoFactorChallenge } from '../../api/auth';
import fullLogo from '../../assets/logo/fullLogo.svg';
import {
  validateLoginEmail,
  validateLoginForm,
  validateLoginPassword,
  type LoginFieldErrors,
} from './loginValidation';
import './LoginPage.css';

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

export const LoginPage: React.FC = () => {
  const particlesRef = useLoginParticles();

  const {
    login,
    verifyTwoFactor,
    resendTwoFactorEmail,
    loginError,
    clearLoginError,
    isAuthenticated,
    isLoading,
  } = useAuth();
  const { lang, setLang } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from =
    (location.state as { from?: string } | null)?.from ||
    (import.meta.env.BASE_URL.replace(/\/$/, '') ? '/address-book' : '/address-book');

  const laravelBase = (import.meta.env.VITE_LARAVEL_URL as string | undefined)?.replace(/\/$/, '') ?? '';

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  if (!isLoading && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleLanguageChange = (checked: boolean) => {
    const next = checked ? 'en' : 'el';
    setLang(next);
    void i18n.changeLanguage(next);
  };

  const clearFieldError = (field: keyof LoginFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    clearLoginError();
    clearFieldError('email');
    if (touched.email) {
      const error = validateLoginEmail(value, t);
      setFieldErrors((prev) => ({ ...prev, email: error }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    clearLoginError();
    clearFieldError('password');
    if (touched.password) {
      const error = validateLoginPassword(value, t);
      setFieldErrors((prev) => ({ ...prev, password: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginError();

    const errors = validateLoginForm(email, password, t);
    setFieldErrors(errors);
    setTouched({ email: true, password: true });
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const nextChallenge = await login(email.trim(), password);
      if (nextChallenge) {
        setChallenge(nextChallenge);
        setOtpCode('');
        setUseRecovery(false);
        if (nextChallenge.method === 'email') {
          setResendSeconds(60);
        }
        return;
      }
      navigate(from, { replace: true });
    } catch {
      // loginError set in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !otpCode.trim()) return;
    clearLoginError();
    setSubmitting(true);
    try {
      await verifyTwoFactor(challenge.challenge_token, otpCode.trim());
      navigate(from, { replace: true });
    } catch {
      // loginError set in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!challenge || resendSeconds > 0 || resendBusy) return;
    setResendBusy(true);
    clearLoginError();
    setLocalError(null);
    try {
      const data = await resendTwoFactorEmail(challenge.challenge_token);
      if (data.masked_email) {
        setChallenge((prev) => (prev ? { ...prev, masked_email: data.masked_email! } : prev));
      }
      setResendSeconds(60);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : t('login.twoFactor.resendFailed', { defaultValue: 'Could not resend code' })
      );
    } finally {
      setResendBusy(false);
    }
  };

  const backToCredentials = () => {
    setChallenge(null);
    setOtpCode('');
    setUseRecovery(false);
    clearLoginError();
  };

  return (
    <div className="shipper-login-page">
      <div ref={particlesRef} className="shipper-login-particles" aria-hidden="true" />

      <div className="shipper-login-content">
        <div className="shipper-login-card-cont">
          <div className="shipper-login-card">
            <div className="shipper-login-box new-login-page">
              <div className="shipper-login-container">
                <label className="shipper-login-lang-switch">
                  <input
                    type="checkbox"
                    checked={lang !== 'el'}
                    onChange={(e) => handleLanguageChange(e.target.checked)}
                    aria-label="Language"
                  />
                  <span className="shipper-login-lang-slider" />
                </label>

                <div className="shipper-login-header ">
                  <a href="/login" className="shipper-login-logo-link mt-2">
                    <img src={fullLogo} alt={t('appName')} className="shipper-login-logo" height={35} />
                  </a>
                  <p className="shipper-login-para">
                    {challenge
                      ? t('login.twoFactor.subtitle', { defaultValue: 'Enter your verification code to continue.' })
                      : t('loginDescription')}
                  </p>
                </div>

                {(loginError || localError) && (
                  <div className="shipper-login-alert" role="alert">
                    {loginError || localError}
                  </div>
                )}

                {!challenge && (
                  <ul className="shipper-login-tabs" role="tablist">
                    <li className="shipper-login-tab-item">
                      <span className="shipper-login-tab active" role="tab" aria-selected>
                        {t('shipper')}
                      </span>
                    </li>
                  </ul>
                )}

                <div className="shipper-login-tab-pane">
                  {challenge ? (
                    <form className="shipper-login-form" onSubmit={handleVerify} noValidate>
                      <div className="shipper-login-field">
                        <label htmlFor="otp-code">
                          {useRecovery
                            ? t('login.twoFactor.recoveryLabel', { defaultValue: 'Recovery code' })
                            : challenge.method === 'email'
                              ? t('login.twoFactor.emailLabel', {
                                  email: challenge.masked_email,
                                  defaultValue: `Code sent to ${challenge.masked_email}`,
                                })
                              : t('login.twoFactor.authenticatorLabel', {
                                  defaultValue: 'Authenticator app code',
                                })}
                        </label>
                        <input
                          id="otp-code"
                          name="code"
                          type="text"
                          inputMode={useRecovery ? 'text' : 'numeric'}
                          autoComplete="one-time-code"
                          className="shipper-login-control"
                          value={otpCode}
                          onChange={(e) => {
                            clearLoginError();
                            setOtpCode(e.target.value);
                          }}
                          placeholder={useRecovery ? 'XXXXXXXXXX' : '000000'}
                          disabled={submitting}
                          autoFocus
                        />
                      </div>

                      {challenge.method === 'email' && !useRecovery && (
                        <div className="shipper-login-forgot" style={{ marginBottom: 12 }}>
                          <button
                            type="button"
                            className="shipper-login-pw-link"
                            style={{ background: 'none', border: 'none', cursor: resendSeconds > 0 ? 'default' : 'pointer', padding: 0 }}
                            onClick={() => void handleResend()}
                            disabled={resendSeconds > 0 || resendBusy}
                          >
                            {resendSeconds > 0
                              ? t('login.twoFactor.resendIn', {
                                  n: resendSeconds,
                                  defaultValue: `Resend in ${resendSeconds}s`,
                                })
                              : t('login.twoFactor.resend', { defaultValue: 'Resend code' })}
                          </button>
                        </div>
                      )}

                      <div className="shipper-login-forgot" style={{ marginBottom: 12 }}>
                        <button
                          type="button"
                          className="shipper-login-pw-link"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => {
                            setUseRecovery((v) => !v);
                            setOtpCode('');
                            clearLoginError();
                          }}
                        >
                          {useRecovery
                            ? t('login.twoFactor.useAppCode', { defaultValue: 'Use authenticator / email code' })
                            : t('login.twoFactor.useRecovery', { defaultValue: 'Use a recovery code' })}
                        </button>
                      </div>

                      <div className="shipper-login-submit-wrap">
                        <button type="submit" className="shipper-login-submit-btn" disabled={submitting || !otpCode.trim()}>
                          {submitting
                            ? t('login.twoFactor.verifying', { defaultValue: 'Verifying…' })
                            : t('login.twoFactor.verify', { defaultValue: 'Verify' })}
                        </button>
                      </div>

                      <div className="shipper-login-join-wrap">
                        <button
                          type="button"
                          className="shipper-login-join"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={backToCredentials}
                        >
                          {t('login.twoFactor.back', { defaultValue: 'Back to sign in' })}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <form className="shipper-login-form" onSubmit={handleSubmit} noValidate>
                        <div className={`shipper-login-field email-input${fieldErrors.email ? ' has-error' : ''}`}>
                          <label htmlFor="emailaddress">{t('loginEmailAddress')}</label>
                          <input
                            id="emailaddress"
                            name="email"
                            type="email"
                            className="shipper-login-control"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onBlur={() => {
                              setTouched((prev) => ({ ...prev, email: true }));
                              const error = validateLoginEmail(email, t);
                              setFieldErrors((prev) => ({ ...prev, email: error }));
                            }}
                            placeholder={t('loginEnterEmail')}
                            autoComplete="email"
                            maxLength={50}
                            aria-invalid={Boolean(fieldErrors.email)}
                            disabled={submitting}
                          />
                          {fieldErrors.email && (
                            <p className="shipper-login-field-error" role="alert">
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>

                        <div
                          className={`shipper-login-field shipper-login-password-div pw-input${fieldErrors.password ? ' has-error' : ''
                            }`}
                        >
                          <label htmlFor="password">{t('loginPassword')}</label>
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className="shipper-login-control"
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            onBlur={() => {
                              setTouched((prev) => ({ ...prev, password: true }));
                              const error = validateLoginPassword(password, t);
                              setFieldErrors((prev) => ({ ...prev, password: error }));
                            }}
                            placeholder={t('loginEnterPassword')}
                            autoComplete="current-password"
                            aria-invalid={Boolean(fieldErrors.password)}
                            disabled={submitting}
                          />
                          <button
                            type="button"
                            className="shipper-login-password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? t('loginHidePassword') : t('loginShowPassword')}
                          >
                            <EyeIcon open={showPassword} />
                          </button>
                          {fieldErrors.password && (
                            <p className="shipper-login-field-error" role="alert">
                              {fieldErrors.password}
                            </p>
                          )}
                        </div>

                        <div className="shipper-login-forgot">
                          <a
                            href={laravelBase ? `${laravelBase}/any/reset/email/shippers` : '#'}
                            className="shipper-login-pw-link"
                          >
                            {t('loginForgotPassword')}
                          </a>
                        </div>

                        <div className="shipper-login-submit-wrap">
                          <button type="submit" className="shipper-login-submit-btn" disabled={submitting}>
                            {submitting ? t('loginSigningIn') : t('loginLogIn')}
                          </button>
                        </div>
                      </form>

                      <div className="shipper-login-join-wrap">
                        <a
                          href={laravelBase ? `${laravelBase}/shipper/register` : '#'}
                          className="shipper-login-join"
                        >
                          {t('loginJoinForFree')}
                        </a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
