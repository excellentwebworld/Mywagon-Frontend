import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { clearStoredToken, setStoredToken } from '../../api/auth';
import { uiSwitchService } from '../../api/services/uiSwitchService';
import { clearInfoFormReminderSkip } from '../../components/layout/InfoFormReminderModal';
import { MyVagonBootScreen } from '../../components/ui/MyVagonLoader';
import { useTranslation } from '../../hooks/useTranslation';
import { postAuthDestination } from '../../hooks/postAuthDestination';
import { applyVerticalNavOnLogin } from '../../utils/navMode';
import { redirectToClassicPanelIfNeeded } from '../../utils/preferredUiRedirect';

/**
 * Blade → React auto-login landing: exchanges one-time handoff code for Sanctum token.
 *
 * Important: do not re-run / abort on `t` identity churn (i18n) — that left the boot
 * screen stuck forever after the first effect cleanup (same pattern as SocialCallbackPage).
 */
export const UiHandoffPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const code = params.get('code')?.trim() || '';
    if (!code) {
      setError(
        tRef.current('uiSwitch.handoffMissing', {
          defaultValue: 'This switch link is missing a code. Please sign in again.',
        }),
      );
      return;
    }
    if (started.current) return;
    started.current = true;

    let unmounted = false;
    (async () => {
      try {
        clearStoredToken();
        const { token, user } = await uiSwitchService.exchangeHandoff(code);
        setStoredToken(token);
        applyVerticalNavOnLogin();
        const profile = (await refreshUser()) || user;
        clearInfoFormReminderSkip(profile.id);

        if (await redirectToClassicPanelIfNeeded(profile)) {
          return;
        }

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });

        // Finish even if this effect was cleaned up for locale/`t` churn.
        navigate(postAuthDestination(profile), { replace: true });
      } catch (err) {
        started.current = false;
        clearStoredToken();
        if (unmounted) return;
        setError(
          err instanceof Error
            ? err.message
            : tRef.current('uiSwitch.handoffFailed', {
                defaultValue: 'This switch link has expired or is invalid. Please sign in again.',
              }),
        );
      }
    })();

    return () => {
      unmounted = true;
    };
    // Intentionally omit `t` — use tRef. Include code via params.
  }, [params, navigate, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p style={{ color: '#b91c1c', maxWidth: 420 }}>{error}</p>
        <Link to="/login" className="font-semibold" style={{ color: '#783fad' }}>
          {t('uiSwitch.backToLogin', { defaultValue: 'Back to login' })}
        </Link>
      </div>
    );
  }

  return <MyVagonBootScreen />;
};
