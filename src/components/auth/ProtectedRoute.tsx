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
import { needsSignupComplete } from '../../hooks/useSignupCompleteGate';
import { MyVagonBootScreen } from '../ui/MyVagonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Normal signup (and social after company info is saved):
 *   past-due → Info Form → KYC → company info → panel
 *
 * Social prospects (signup_complete=false) may browse every page. Operational
 * create/mutate actions are redirected to /complete-signup separately.
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

  // Social one-click prospects: browse dashboard and all pages; do not hard-lock
  // to complete-signup / KYC / info form. Mutations are soft-gated on action.
  const socialProspect = needsSignupComplete(user);

  if (!socialProspect && needsInfoFormHardGate(user) && !isInfoFormAllowedPath(location.pathname)) {
    return <Navigate to="/settings/organization?from=info_form" replace />;
  }

  if (!socialProspect && needsKycGate(user) && !isKycGateAllowedPath(location.pathname, user)) {
    return <Navigate to="/settings/compliance" replace />;
  }

  if (!socialProspect && needsCompanyInfoGate(user) && !isCompanyInfoGateAllowedPath(location.pathname)) {
    return <Navigate to="/settings/organization?from=company_info" replace />;
  }

  return <>{children}</>;
};
