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
  needsKycHardGate,
} from '../../hooks/useKycGate';
import {
  isInfoFormAllowedPath,
  needsInfoFormHardGate,
} from '../../hooks/useInfoFormGate';
import {
  isSignupCompleteAllowedPath,
  isSocialShipper,
  needsSignupComplete,
  openSignupIncompleteModal,
} from '../../hooks/useSignupCompleteGate';
import { MyVagonBootScreen } from '../ui/MyVagonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate sequence:
 *   past-due →
 *   social incomplete: dashboard only (+ settings/billing for profile & past-due) →
 *   social after profile: submit KYC if needed → Info Form → dashboard / tour
 *     (KYC pending = already submitted — do not hard-lock to compliance)
 *   normal: Info Form → KYC → company info → panel
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const location = useLocation();

  const social = isSocialShipper(user);
  const signupDone = !needsSignupComplete(user);
  const signupPathBlocked =
    isAuthenticated &&
    !signupDone &&
    !isSignupCompleteAllowedPath(location.pathname, user);

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

  useEffect(() => {
    if (signupPathBlocked) {
      openSignupIncompleteModal();
    }
  }, [signupPathBlocked]);

  if (isLoading) {
    return <MyVagonBootScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user?.has_past_due && !isPastDueAllowedPath(location.pathname)) {
    return <Navigate to="/billing" replace />;
  }

  // Incomplete social may browse dashboard/settings; operational routes are blocked
  // (same allowlist as sidebar soft-gate). Hard KYC/info gates apply after signup_complete.
  if (signupPathBlocked) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    signupDone &&
    social &&
    needsKycHardGate(user) &&
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

  if (!social && needsKycHardGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
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
