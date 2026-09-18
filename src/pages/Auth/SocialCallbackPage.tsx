import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clearStoredToken, setStoredToken } from '../../api/auth';
import { clearInfoFormReminderSkip } from '../../components/layout/InfoFormReminderModal';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import { useTranslation } from '../../hooks/useTranslation';
import { postAuthDestination } from '../../hooks/postAuthDestination';
import { needsSignupComplete } from '../../hooks/useSignupCompleteGate';
import { applyVerticalNavOnLogin } from '../../utils/navMode';
import type { TwoFactorChallenge, TwoFactorMethod } from '../../api/auth';

function forceLogoutKeepPage(): void {
  window.dispatchEvent(
    new CustomEvent('shipper:force-logout', { detail: { skipRedirect: true } }),
  );
}

/**
 * OAuth return landing: stores Sanctum token (or hands off to 2FA on /login).
 */
export const SocialCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, verifyTwoFactor, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [handoffDone, setHandoffDone] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    const twoFactor = params.get('two_factor') === '1';
    const challengeToken = params.get('challenge_token');
    const method = params.get('method') as TwoFactorMethod | null;
    const maskedEmail = params.get('masked_email') || '';
    const signupCompleteParam = params.get('signup_complete');

    if (twoFactor && challengeToken && method) {
      clearStoredToken();
      forceLogoutKeepPage();
      setChallenge({
        challenge_token: challengeToken,
        method,
        masked_email: maskedEmail,
      });
      return;
    }

    if (!token) {
      clearStoredToken();
      forceLogoutKeepPage();
      setError(
        t('socialAuth.missingToken', {
          defaultValue: 'Social sign-in failed. Please try again.',
        }),
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        clearStoredToken();
        setStoredToken(token);
        applyVerticalNavOnLogin();
        const profile = await refreshUser();
        if (cancelled) return;

        if (!profile) {
          throw new Error('missing profile');
        }

        clearInfoFormReminderSkip(profile.id);

        // Wait one frame so AuthContext user/token commit before CompleteSignup mounts.
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
        if (cancelled) return;

        setHandoffDone(true);
        if (signupCompleteParam === '0' || needsSignupComplete(profile)) {
          navigate('/complete-signup', { replace: true });
          return;
        }
        navigate(postAuthDestination(profile), { replace: true });
      } catch {
        if (cancelled) return;
        clearStoredToken();
        forceLogoutKeepPage();
        setError(
          t('socialAuth.sessionFailed', {
            defaultValue: 'Could not start your session. Please try again.',
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, refreshUser, navigate, t]);

  if (error) {
    return <Navigate to={`/login?social_error=1&message=${encodeURIComponent(error)}`} replace />;
  }

  if (challenge) {
    return (
      <div className="shipper-login-page" style={{ display: 'grid', placeItems: 'center' }}>
        <form
          className="shipper-login-card"
          style={{ padding: 24, maxWidth: 420, width: '100%' }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!otpCode.trim()) return;
            setSubmitting(true);
            try {
              const profile = await verifyTwoFactor(challenge.challenge_token, otpCode.trim());
              navigate(postAuthDestination(profile), { replace: true });
            } catch {
              // loginError in context
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <p>
            {t('login.twoFactor.subtitle', {
              defaultValue: 'Enter your verification code to continue.',
            })}
          </p>
          <input
            className="shipper-login-control"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            autoFocus
            placeholder="000000"
          />
          <button
            type="submit"
            className="shipper-login-submit-btn"
            disabled={submitting || !otpCode.trim()}
            style={{ marginTop: 12 }}
          >
            {t('login.twoFactor.verify', { defaultValue: 'Verify' })}
          </button>
        </form>
      </div>
    );
  }

  if (handoffDone && isAuthenticated && user && params.get('token')) {
    if (needsSignupComplete(user) || params.get('signup_complete') === '0') {
      return <Navigate to="/complete-signup" replace />;
    }
    return <Navigate to={postAuthDestination(user)} replace />;
  }

  return <MyVagonBootScreen />;
};
