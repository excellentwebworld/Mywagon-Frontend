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
 */
export const UiHandoffPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError(
        t('uiSwitch.handoffMissing', {
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

        if (unmounted) return;
        navigate(postAuthDestination(profile), { replace: true });
      } catch (err) {
        if (unmounted) return;
        started.current = false;
        clearStoredToken();
        setError(
          err instanceof Error
            ? err.message
            : t('uiSwitch.handoffFailed', {
                defaultValue: 'This switch link has expired or is invalid. Please sign in again.',
              }),
        );
      }
    })();

    return () => {
      unmounted = true;
    };
  }, [params, navigate, refreshUser, t]);

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
