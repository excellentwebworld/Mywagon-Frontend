import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from './useTranslation';
import { needsSignupComplete, socialProfileNextPath } from './useSignupCompleteGate';

/**
 * Soft-gate for operational actions while social required details are incomplete.
 * Normal email signup never has signup_complete=false — unaffected.
 */
export function useRequireSignupComplete(): {
  signupIncomplete: boolean;
  requireSignupComplete: () => boolean;
} {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useApp();
  const { t } = useTranslation();

  const signupIncomplete = needsSignupComplete(user);

  const requireSignupComplete = useCallback((): boolean => {
    if (!user) return false;
    if (!signupIncomplete) return true;

    showToast(
      t('signupComplete.requiredToast', {
        defaultValue: 'Please complete your profile information to continue.',
      }),
      'info',
    );
    const next = socialProfileNextPath(user);
    const dest = next.includes('?') ? `${next}&blocked=1` : `${next}?blocked=1`;
    navigate(dest, { replace: false, state: { from: location.pathname } });
    return false;
  }, [user, signupIncomplete, showToast, t, navigate, location.pathname]);

  return { signupIncomplete, requireSignupComplete };
}
