import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { isPastDueAllowedPath } from '../../hooks/usePastDueLock';
import {
  isCompanyInfoGateAllowedPath,
  isKycGateAllowedPath,
  needsCompanyInfoGate,
  needsKycGate,
} from '../../hooks/useKycGate';
import {
  isInfoFormAllowedPath,
  needsInfoFormHardGate,
} from '../../hooks/useInfoFormGate';
import {
  isSocialShipper,
  needsSignupComplete,
} from '../../hooks/useSignupCompleteGate';
import { MyVagonBootScreen } from '../ui/MyVagonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate sequence:
 *   past-due →
 *   social incomplete: browse panel (features soft-gated via modal) →
 *   social after profile: KYC → Info Form → panel
 *   normal: Info Form → KYC → company info → panel
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (sessionStorage.getItem('shipper_mfa_reset_toast') !== '1') return;
    sessionStorage.removeItem('shipper_mfa_reset_toast');
    showToast(
      t('login.twoFactor.recoveryResetToast', {
        defaultValue:
          'Two-factor authentication was reset. Please re-enable it in Settings → Security.',
      }),
      'info',
    );
  }, [isAuthenticated, showToast, t]);

  if (isLoading) {
    return <MyVagonBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.has_past_due && !isPastDueAllowedPath(location.pathname)) {
    return <Navigate to="/billing" replace />;
  }

  // Incomplete social may browse; soft-gate handles feature actions.
  // Hard gates below only apply after signup_complete.
  const social = isSocialShipper(user);
  const signupDone = !needsSignupComplete(user);

  if (
    signupDone &&
    social &&
    needsKycGate(user) &&
    !isKycGateAllowedPath(location.pathname, user)
  ) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (
    signupDone &&
    needsInfoFormHardGate(user) &&
    !isInfoFormAllowedPath(location.pathname)
  ) {
    return <Navigate to="/settings/organization?from=info_form" replace />;
  }

  if (!social && needsKycGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (
    signupDone &&
    needsCompanyInfoGate(user) &&
    !isCompanyInfoGateAllowedPath(location.pathname)
  ) {
    return <Navigate to="/settings/organization?from=company_info" replace />;
  }

  return <>{children}</>;
};
