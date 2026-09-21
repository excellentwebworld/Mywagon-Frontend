import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useTranslation } from './useTranslation';
import { isSocialShipper, needsSignupComplete, completeSignupPath } from './useSignupCompleteGate';
import { needsKycGate } from './useKycGate';
import { needsInfoFormHardGate } from './useInfoFormGate';
import { postAuthDestination } from './postAuthDestination';

/**
 * Soft-gate for operational actions (create products, addresses, partners,
 * bids, shipments). Social prospects may browse; this redirects them to
 * complete the regular signup form (company info + KYC).
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

  const signupIncomplete =
    needsSignupComplete(user) ||
    (isSocialShipper(user) && (needsKycGate(user) || needsInfoFormHardGate(user)));

  const requireSignupComplete = useCallback((): boolean => {
    if (!user) return false;
    if (!signupIncomplete) return true;

    const dest = needsSignupComplete(user)
      ? completeSignupPath(location.pathname)
      : postAuthDestination(user, location.pathname);
    if (needsSignupComplete(user)) {
      showToast(
        t('signupComplete.requiredToast', {
          defaultValue: 'Please complete your company information to continue.',
        }),
        'info',
      );
    } else if (needsInfoFormHardGate(user)) {
      showToast(
        t('signupComplete.infoFormRequiredToast', {
          defaultValue: 'Please complete the mandatory information questions to continue.',
        }),
        'info',
      );
    } else if (needsKycGate(user)) {
      showToast(
        t('signupComplete.kycRequiredToast', {
          defaultValue: 'Please upload your KYC documents to continue.',
        }),
        'info',
      );
    }
    navigate(dest, { replace: false });
    return false;
  }, [user, signupIncomplete, showToast, t, navigate, location.pathname]);

  return { signupIncomplete, requireSignupComplete };
}
