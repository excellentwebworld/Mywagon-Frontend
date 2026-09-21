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
  completeSignupPath,
  isSignupCompleteAllowedPath,
  isSocialShipper,
  needsSignupComplete,
} from '../../hooks/useSignupCompleteGate';
import { MyVagonBootScreen } from '../ui/MyVagonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Gate sequence:
 *   past-due → (social incomplete: complete-signup) →
 *   social: KYC → Info Form → company info → panel
 *   normal: Info Form → KYC → company info → panel
 *
 * Incomplete social users cannot browse other pages (same style as KYC lock).
 * Trying another URL redirects to /complete-signup?blocked=1 (modal explains why).
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

  // Social incomplete: hard-lock to complete-signup (profile / required details)
  if (needsSignupComplete(user) && !isSignupCompleteAllowedPath(location.pathname)) {
    return (
      <Navigate
        to={completeSignupPath(location.pathname, { blocked: true })}
        replace
      />
    );
  }

  const social = isSocialShipper(user);

  // Social after company details: KYC before Info Form
  if (social && needsKycGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (needsInfoFormHardGate(user) && !isInfoFormAllowedPath(location.pathname)) {
    return <Navigate to="/settings/organization?from=info_form" replace />;
  }

  // Normal (and social after info form): KYC gate
  if (!social && needsKycGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (needsCompanyInfoGate(user) && !isCompanyInfoGateAllowedPath(location.pathname)) {
    return <Navigate to="/settings/organization?from=company_info" replace />;
  }

  return <>{children}</>;
};
