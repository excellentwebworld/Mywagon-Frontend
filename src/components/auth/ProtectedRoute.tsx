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
  isSignupCompleteAllowedPath,
  isSocialShipper,
  needsSignupComplete,
  socialProfileNextPath,
} from '../../hooks/useSignupCompleteGate';
import { MyVagonBootScreen } from '../ui/MyVagonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function withBlockedFlag(path: string): string {
  if (path.includes('blocked=1')) return path;
  return path.includes('?') ? `${path}&blocked=1` : `${path}?blocked=1`;
}

/**
 * Gate sequence:
 *   past-due →
 *   social incomplete: personal → organization →
 *   social: KYC → Info Form → panel
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

  // Social incomplete: hard-lock to personal / organization until company details done
  if (needsSignupComplete(user) && !isSignupCompleteAllowedPath(location.pathname, user)) {
    return <Navigate to={withBlockedFlag(socialProfileNextPath(user))} replace />;
  }

  const social = isSocialShipper(user);

  // KYC only after social phone + company/address are done (signup_complete).
  // Running KYC before that ping-pongs personal ↔ compliance and blanks the page.
  if (
    !needsSignupComplete(user) &&
    social &&
    needsKycGate(user) &&
    !isKycGateAllowedPath(location.pathname, user)
  ) {
    return <Navigate to="/settings/compliance" replace />;
  }

  // Info form only after social profile steps are done (same blank-page risk).
  if (
    !needsSignupComplete(user) &&
    needsInfoFormHardGate(user) &&
    !isInfoFormAllowedPath(location.pathname)
  ) {
    return <Navigate to="/settings/organization?from=info_form" replace />;
  }

  if (!social && needsKycGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (
    !needsSignupComplete(user) &&
    needsCompanyInfoGate(user) &&
    !isCompanyInfoGateAllowedPath(location.pathname)
  ) {
    return <Navigate to="/settings/organization?from=company_info" replace />;
  }

  return <>{children}</>;
};
