import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from './useTranslation';
import { completeSignupPath, needsSignupComplete } from './useSignupCompleteGate';

/**
 * Soft-gate for account actions. Returns false (and redirects) when the social
 * prospect still needs to finish company signup.
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
    if (!signupIncomplete) return true;
    showToast(
      t('signupComplete.requiredToast', {
        defaultValue: 'Please complete your company information to continue.',
      }),
      'info',
    );
    navigate(completeSignupPath(location.pathname + location.search), { replace: false });
    return false;
  }, [signupIncomplete, showToast, t, navigate, location.pathname, location.search]);

  return { signupIncomplete, requireSignupComplete };
}
