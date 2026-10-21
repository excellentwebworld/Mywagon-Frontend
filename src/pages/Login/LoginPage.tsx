import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Radar,
  Route,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import type { ShipperUser, TwoFactorChallenge, TwoFactorMethod } from '../../api/auth';
import { clearStoredToken, setStoredToken } from '../../api/auth';
import fullLogo from '../../assets/logo/fullLogo.svg';
import {
  validateLoginEmail,
  validateLoginForm,
  validateLoginPassword,
  type LoginFieldErrors,
} from './loginValidation';
import { clearSignupDraft } from '../Register/signupDraft';
import { SocialAuthButtons } from '../../components/auth/SocialAuthButtons';
import { AuthThemeToggle } from '../../components/auth/AuthThemeToggle';
import { postAuthDestination } from '../../hooks/postAuthDestination';
import { clearInfoFormReminderSkip } from '../../components/layout/InfoFormReminderModal';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import { applyVerticalNavOnLogin } from '../../utils/navMode';
import { localizeSocialAuthError } from '../../utils/socialAuthErrors';
import './LoginPage.css';

function isTwoFactorChallenge(
  value: TwoFactorChallenge | ShipperUser,
): value is TwoFactorChallenge {
  return 'challenge_token' in value;
}

async function finishLoginNavigation(
  user: ShipperUser,
  from: string,
  navigate: (to: string, opts?: { replace?: boolean }) => void,
): Promise<void> {
  // This form is the React panel. The login request stores preferred_ui=react.
  navigate(postAuthDestination({ ...user, preferred_ui: 'react' }, from), { replace: true });
}

/** Decorative route-network motif for the brand panel. */
const RouteArtwork: React.FC = () => (
  <svg
    className="mv-auth__route"
    viewBox="0 0 560 300"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id="mvRouteGrad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#9b51e0" />
        <stop offset="55%" stopColor="#7b7ce6" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <path
      className="mv-auth__route-track"
      d="M48 248 C 168 248, 150 150, 268 138 S 448 118, 516 44"
    />
    <path
      className="mv-auth__route-progress"
      d="M48 248 C 168 248, 150 150, 268 138 S 448 118, 516 44"
    />
    <circle className="mv-auth__node" cx="48" cy="248" r="9" />
    <circle className="mv-auth__node-dot" cx="48" cy="248" r="3.2" />
    <circle className="mv-auth__node" cx="268" cy="138" r="7" />
    <circle className="mv-auth__node-dot" cx="268" cy="138" r="2.6" />
    <circle className="mv-auth__node mv-auth__node--end" cx="516" cy="44" r="9" />
    <circle className="mv-auth__node-dot mv-auth__node-dot--end" cx="516" cy="44" r="3.2" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const {
    login,
    verifyTwoFactor,
    resendTwoFactorEmail,
    sendTwoFactorRecoveryEmail,
    verifyTwoFactorRecovery,
    refreshUser,
    loginError,
    clearLoginError,
    isAuthenticated,
    isLoading,
    user,
    logout,
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
  const [lostAccess, setLostAccess] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [socialHandoff, setSocialHandoff] = useState(false);
  const socialHandoffStarted = useRef(false);
  // Keep t out of the OAuth effect deps — locale sync after refreshUser recreates t and
  // was cancelling the in-flight handoff (spinner stuck on /login?token=…).
  const tRef = useRef(t);
  tRef.current = t;

  const from =
    (location.state as { from?: string } | null)?.from || '/dashboard';

  const oauthParams = new URLSearchParams(location.search);
  const oauthToken = oauthParams.get('token');
  const oauthTwoFactor = oauthParams.get('two_factor') === '1';
  const hasOauthHandoff = Boolean(oauthToken || oauthTwoFactor);

  useEffect(() => {
    clearSignupDraft();
  }, []);

  // Re-translate login field errors when language toggles after submit.
  const prevLoginLangRef = useRef(lang);
  useEffect(() => {
    if (prevLoginLangRef.current === lang) return;
    prevLoginLangRef.current = lang;
    setFieldErrors((prev) => {
      if (!prev.email && !prev.password) return prev;
      return validateLoginForm(email, password, t);
    });
  }, [lang, t, email, password]);

  // OAuth returns to /login?token=…&signup_complete=0 — finish session HERE (do not rely on
  // /auth/social/callback; Amplify/deep-link timing was leaving users stuck on this URL).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('social_error') === '1') return;

    const twoFactor = params.get('two_factor') === '1';
    const challengeToken = params.get('challenge_token');
    const method = params.get('method') as TwoFactorMethod | null;
    const maskedEmail = params.get('masked_email') || '';
    const token = params.get('token');

    if (twoFactor && challengeToken && method) {
      setChallenge({
        challenge_token: challengeToken,
        method,
        masked_email: maskedEmail,
      });
      // Drop query so refresh does not re-enter handoff.
      navigate('/login', { replace: true });
      return;
    }

    if (!token) return;
    if (socialHandoffStarted.current) return;
    socialHandoffStarted.current = true;
    setSocialHandoff(true);

    let unmounted = false;
    (async () => {
      try {
        clearStoredToken();
        setStoredToken(token);
        applyVerticalNavOnLogin();
        const profile = await refreshUser();
        if (!profile) {
          throw new Error('missing profile');
        }
        clearInfoFormReminderSkip(profile.id);
        // One frame so AuthContext user/token commit before the destination mounts.
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

        // Always navigate once the session exists. Do not abort for effect cleanup /
        // locale sync — that left the boot spinner stuck with ?token= still in the URL.
        const dest = postAuthDestination(profile, from);
        navigate(dest, { replace: true });
      } catch {
        if (unmounted) return;
        socialHandoffStarted.current = false;
        setSocialHandoff(false);
        clearStoredToken();
        setLocalError(
          tRef.current('socialAuth.sessionFailed', {
            defaultValue: 'Could not start your session. Please try again.',
          }),
        );
        navigate('/login?social_error=1', { replace: true });
      }
    })();

    return () => {
      unmounted = true;
      // Strict Mode / dep churn: allow a fresh handoff attempt on the next effect run.
      socialHandoffStarted.current = false;
    };
  }, [location.search, navigate, refreshUser, from]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('social_error') !== '1') return;
    // Backend may return English in the URL; map known strings to panel language.
    const message = localizeSocialAuthError(params.get('message'), t);
    setLocalError(message);
    // Do not bounce back to a previous incomplete social account's complete-signup.
    if (isAuthenticated) {
      void logout();
    }
  }, [location.search, t, isAuthenticated, logout]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendSeconds]);

  if (socialHandoff || (hasOauthHandoff && !oauthTwoFactor)) {
    return <MyVagonBootScreen />;
  }

  if (!isLoading && isAuthenticated) {
    const params = new URLSearchParams(location.search);
    // Stay on login until logout finishes after a social error.
    if (params.get('social_error') === '1') {
      return <MyVagonBootScreen />;
    }
    const dest = user ? postAuthDestination(user, from) : from;
    return <Navigate to={dest} replace />;
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
      const result = await login(email.trim(), password);
      if (isTwoFactorChallenge(result)) {
        setChallenge(result);
        setOtpCode('');
        setUseRecovery(false);
        setLostAccess(false);
        if (result.method === 'email') {
          setResendSeconds(60);
        }
        return;
      }
      await finishLoginNavigation(result, from, navigate);
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
    setLocalError(null);
    setSubmitting(true);
    try {
      if (lostAccess) {
        const { two_factor_reset, user: profile } = await verifyTwoFactorRecovery(
          challenge.challenge_token,
          otpCode.trim(),
        );
        if (two_factor_reset) {
          sessionStorage.setItem('shipper_mfa_reset_toast', '1');
        }
        await finishLoginNavigation(profile, from, navigate);
      } else {
        const profile = await verifyTwoFactor(challenge.challenge_token, otpCode.trim());
        await finishLoginNavigation(profile, from, navigate);
      }
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
      const data = lostAccess
        ? await sendTwoFactorRecoveryEmail(challenge.challenge_token)
        : await resendTwoFactorEmail(challenge.challenge_token);
      if (data.masked_email) {
        setChallenge((prev: TwoFactorChallenge | null) =>
          prev ? { ...prev, masked_email: data.masked_email! } : prev
        );
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

  const startLostAccess = async () => {
    if (!challenge || resendBusy) return;
    setUseRecovery(false);
    setOtpCode('');
    setLostAccess(true);
    clearLoginError();
    setLocalError(null);
    setResendBusy(true);
    try {
      const data = await sendTwoFactorRecoveryEmail(challenge.challenge_token);
      if (data.masked_email) {
        setChallenge((prev: TwoFactorChallenge | null) =>
          prev ? { ...prev, masked_email: data.masked_email! } : prev
        );
      }
      setResendSeconds(60);
    } catch (err) {
      setLostAccess(false);
      setLocalError(
        err instanceof Error
          ? err.message
          : t('login.twoFactor.resendFailed', { defaultValue: 'Could not send recovery email' })
      );
    } finally {
      setResendBusy(false);
    }
  };

  const backToCredentials = () => {
    setChallenge(null);
    setOtpCode('');
    setUseRecovery(false);
    setLostAccess(false);
    clearLoginError();
    setLocalError(null);
  };

  const alertMessage = loginError || localError;

  const otpLabel = lostAccess
    ? t('login.twoFactor.emailLabel', {
        email: challenge?.masked_email,
        defaultValue: `Code sent to ${challenge?.masked_email}`,
      })
    : useRecovery
      ? t('login.twoFactor.recoveryLabel', { defaultValue: 'Recovery code' })
      : challenge?.method === 'email'
        ? t('login.twoFactor.emailLabel', {
            email: challenge?.masked_email,
            defaultValue: `Code sent to ${challenge?.masked_email}`,
          })
        : t('login.twoFactor.authenticatorLabel', { defaultValue: 'Authenticator app code' });

  return (
    <div className="mv-auth">
      {/* ---------------------------------------------------------------- */}
      {/* Brand / network panel (desktop only, decorative)                  */}
      {/* ---------------------------------------------------------------- */}
      <aside className="mv-auth__brand">
        <RouteArtwork />

        <a href="/login" className="mv-auth__brand-logo-link">
          <img src={fullLogo} alt={t('appName')} className="mv-auth__brand-logo" />
        </a>

        <div className="mv-auth__brand-body">
          <span className="mv-auth__eyebrow">
            <span className="mv-auth__pulse" aria-hidden="true" />
            {t('login.brand.eyebrow', { defaultValue: 'Shipper platform' })}
          </span>
          <h2 className="mv-auth__brand-title">
            {t('login.brand.titleLead', { defaultValue: 'Move every load with' })}{' '}
            <em>{t('login.brand.titleAccent', { defaultValue: 'full visibility' })}</em>
          </h2>
          <p className="mv-auth__brand-sub">
            {t('login.brand.subtitle', {
              defaultValue:
                'Plan shipments, collect quotes from vetted carriers and forwarders, and track every leg from pickup to delivery.',
            })}
          </p>
        </div>

        <div className="mv-auth__stats">
          <div className="mv-auth__stat">
            <span className="mv-auth__stat-icon">
              <Truck size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="mv-auth__stat-label">
              {t('login.brand.stat1', { defaultValue: 'Vetted carrier network' })}
            </span>
            <span className="mv-auth__stat-hint">
              {t('login.brand.stat1Hint', { defaultValue: 'Compare quotes side by side' })}
            </span>
          </div>
          <div className="mv-auth__stat">
            <span className="mv-auth__stat-icon">
              <Radar size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="mv-auth__stat-label">
              {t('login.brand.stat2', { defaultValue: 'Live shipment tracking' })}
            </span>
            <span className="mv-auth__stat-hint">
              {t('login.brand.stat2Hint', { defaultValue: 'Status on every leg' })}
            </span>
          </div>
          <div className="mv-auth__stat">
            <span className="mv-auth__stat-icon">
              <Route size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="mv-auth__stat-label">
              {t('login.brand.stat3', { defaultValue: 'Multi-stop itineraries' })}
            </span>
            <span className="mv-auth__stat-hint">
              {t('login.brand.stat3Hint', { defaultValue: 'Built in a few clicks' })}
            </span>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Auth panel                                                        */}
      {/* ---------------------------------------------------------------- */}
      <main className="mv-auth__panel">
        <div className="mv-auth__card">
          <div className="mv-auth__topbar">
            <a href="/login" className="mv-auth__logo-link">
              <img src={fullLogo} alt={t('appName')} className="mv-auth__logo" />
            </a>

            <div className="mv-auth__topbar-actions">
              <AuthThemeToggle />
              <label className="mv-auth__lang">
                <input
                  type="checkbox"
                  checked={lang !== 'el'}
                  onChange={(e) => handleLanguageChange(e.target.checked)}
                  aria-label={t('login.languageLabel', { defaultValue: 'Language' })}
                />
                <span className="mv-auth__lang-thumb" aria-hidden="true" />
                <span className="mv-auth__lang-opt mv-auth__lang-opt--el">EL</span>
                <span className="mv-auth__lang-opt mv-auth__lang-opt--en">EN</span>
              </label>
            </div>
          </div>

          <div className="mv-auth__head">
            {!challenge && <span className="mv-auth__badge">{t('shipper')}</span>}
            <h1 className="mv-auth__title">
              {challenge
                ? lostAccess
                  ? t('login.twoFactor.resetTitle', { defaultValue: 'Reset two-factor access' })
                  : t('login.twoFactor.title', { defaultValue: 'Verify it is you' })
                : t('login.title', { defaultValue: 'Sign in to your panel' })}
            </h1>
            <p className="mv-auth__sub">
              {challenge
                ? lostAccess
                  ? t('login.twoFactor.lostAccessHint', {
                      email: challenge.masked_email,
                      defaultValue: `We sent a code to ${challenge.masked_email}. Enter it to reset 2FA and sign in.`,
                    })
                  : t('login.twoFactor.subtitle', {
                      defaultValue: 'Enter your verification code to continue.',
                    })
                : t('loginDescription')}
            </p>
          </div>

          {alertMessage && (
            <div className="mv-auth__alert" role="alert">
              <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />
              <span>{alertMessage}</span>
            </div>
          )}

          {challenge ? (
            <form onSubmit={handleVerify} noValidate>
              <div className="mv-auth__field mv-auth__field--otp">
                <div className="mv-auth__label-row">
                  <label htmlFor="otp-code">{otpLabel}</label>
                </div>
                <div className="mv-auth__input-wrap">
                  <input
                    id="otp-code"
                    name="code"
                    type="text"
                    inputMode={useRecovery && !lostAccess ? 'text' : 'numeric'}
                    autoComplete="one-time-code"
                    className="mv-auth__control"
                    value={otpCode}
                    onChange={(e) => {
                      clearLoginError();
                      setLocalError(null);
                      setOtpCode(e.target.value);
                    }}
                    placeholder={useRecovery && !lostAccess ? 'XXXXXXXXXX' : '000000'}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
              </div>

              <div className="mv-auth__actions">
                {(lostAccess || (challenge.method === 'email' && !useRecovery)) && (
                  <button
                    type="button"
                    className="mv-auth__link"
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
                )}

                {!lostAccess && (
                  <button
                    type="button"
                    className="mv-auth__link"
                    onClick={() => {
                      setUseRecovery((v) => !v);
                      setOtpCode('');
                      clearLoginError();
                      setLocalError(null);
                    }}
                  >
                    {useRecovery
                      ? t('login.twoFactor.useAppCode', {
                          defaultValue: 'Use authenticator / email code',
                        })
                      : t('login.twoFactor.useRecovery', { defaultValue: 'Use a recovery code' })}
                  </button>
                )}

                {!lostAccess && challenge.method === 'authenticator' && (
                  <button
                    type="button"
                    className="mv-auth__link"
                    onClick={() => void startLostAccess()}
                    disabled={resendBusy}
                  >
                    {t('login.twoFactor.lostAccess', {
                      defaultValue: 'Lost access to your authenticator?',
                    })}
                  </button>
                )}

                {lostAccess && (
                  <button
                    type="button"
                    className="mv-auth__link"
                    onClick={() => {
                      setLostAccess(false);
                      setOtpCode('');
                      setUseRecovery(false);
                      clearLoginError();
                      setLocalError(null);
                    }}
                  >
                    {t('login.twoFactor.backTo2fa', {
                      defaultValue: 'Back to authenticator / recovery code',
                    })}
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="mv-auth__submit"
                disabled={submitting || !otpCode.trim()}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <span className="mv-auth__spinner" aria-hidden="true" />
                    {t('login.twoFactor.verifying', { defaultValue: 'Verifying…' })}
                  </>
                ) : (
                  <>
                    <KeyRound size={17} strokeWidth={2} aria-hidden="true" />
                    {lostAccess
                      ? t('login.twoFactor.resetAndSignIn', { defaultValue: 'Reset 2FA & sign in' })
                      : t('login.twoFactor.verify', { defaultValue: 'Verify' })}
                  </>
                )}
              </button>

              <div className="mv-auth__divider">
                <span>{t('login.orLabel', { defaultValue: 'or' })}</span>
              </div>

              <button type="button" className="mv-auth__secondary" onClick={backToCredentials}>
                <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
                {t('login.twoFactor.back', { defaultValue: 'Back to sign in' })}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} noValidate>
                <div className={`mv-auth__field${fieldErrors.email ? ' has-error' : ''}`}>
                  <div className="mv-auth__label-row">
                    <label htmlFor="emailaddress">{t('loginEmailAddress')}</label>
                  </div>
                  <div className="mv-auth__input-wrap">
                    <span className="mv-auth__input-icon">
                      <Mail size={17} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <input
                      id="emailaddress"
                      name="email"
                      type="email"
                      className="mv-auth__control"
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
                      aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                      disabled={submitting}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="mv-auth__error" id="email-error" role="alert">
                      <AlertCircle size={13} strokeWidth={2.2} aria-hidden="true" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div
                  className={`mv-auth__field mv-auth__field--pw${fieldErrors.password ? ' has-error' : ''}`}
                >
                  <div className="mv-auth__label-row">
                    <label htmlFor="password">{t('loginPassword')}</label>
                    <Link to="/forgot-password" className="mv-auth__link">
                      {t('loginForgotPassword', 'Forgot Password?')}
                    </Link>
                  </div>
                  <div className="mv-auth__input-wrap">
                    <span className="mv-auth__input-icon">
                      <Lock size={17} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="mv-auth__control"
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
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="mv-auth__pw-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? t('loginHidePassword') : t('loginShowPassword')}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff size={17} strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Eye size={17} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mv-auth__error" id="password-error" role="alert">
                      <AlertCircle size={13} strokeWidth={2.2} aria-hidden="true" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="mv-auth__submit"
                  disabled={submitting}
                  aria-busy={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="mv-auth__spinner" aria-hidden="true" />
                      {t('loginSigningIn')}
                    </>
                  ) : (
                    t('loginLogIn')
                  )}
                </button>
              </form>

              <div className="mv-auth__divider">
                <span>{t('login.orLabel', { defaultValue: 'or' })}</span>
              </div>

              <SocialAuthButtons disabled={submitting} compact />

              <div className="mv-auth__divider">
                <span>{t('login.newHere', { defaultValue: 'New to MY VAGON?' })}</span>
              </div>

              <Link to="/shipper/register" className="mv-auth__secondary" onClick={clearSignupDraft}>
                {t('loginJoinForFree')}
              </Link>

              <p className="mv-auth__trust">
                <ShieldCheck size={14} strokeWidth={1.9} aria-hidden="true" />
                {t('login.trustNote', {
                  defaultValue: 'Encrypted sign-in with two-factor protection',
                })}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
