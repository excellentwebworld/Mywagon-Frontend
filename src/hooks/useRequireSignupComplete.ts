import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from './useTranslation';
import { needsSignupComplete, completeSignupPath } from './useSignupCompleteGate';

/**
 * Soft-gate for operational actions while social required details are incomplete.
 * Primary lock is ProtectedRoute; this catches create/mutate entry points.
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
        defaultValue: 'Please complete your company information to continue.',
      }),
      'info',
    );
    navigate(completeSignupPath(location.pathname, { blocked: true }), { replace: false });
    return false;
  }, [user, signupIncomplete, showToast, t, navigate, location.pathname]);

  return { signupIncomplete, requireSignupComplete };
}
